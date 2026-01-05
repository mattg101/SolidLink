using System;
using System.Collections.Generic;
using System.Linq;
using SolidWorks.Interop.sldworks;
using SolidWorks.Interop.swconst;
using GRM = SolidLink.Addin.Model;

namespace SolidLink.Addin.Services
{
    public class TreeTraverser
    {
        private readonly SldWorks swApp;
        private readonly GeometryExtractor geometryExtractor;

        public TreeTraverser(SldWorks app)
        {
            swApp = app ?? throw new ArgumentNullException(nameof(app));
            geometryExtractor = new GeometryExtractor(swApp);
        }

        public GRM.RobotModel ExtractModel(ModelDoc2 model)
        {
            if (model == null) return null;

            var robot = new GRM.RobotModel
            {
                Name = model.GetTitle()
            };

            if (model.GetType() == (int)swDocumentTypes_e.swDocASSEMBLY)
            {
                var conf = (Configuration)model.GetActiveConfiguration();
                var rootComp = (Component2)conf.GetRootComponent3(true);
                robot.RootFrame = TraverseComponent(rootComp);
            }
            else
            {
                // Handle single part documents as well
                robot.RootFrame = TraversePart(model);
            }

            return robot;
        }

        private GRM.Frame TraverseComponent(Component2 comp)
        {
            if (comp == null) return null;

            var frame = new GRM.Frame
            {
                Name = comp.Name2,
                Type = "COMPONENT",
                ReferencePath = comp.Name2,
                LocalTransform = ExtractTransform(comp.GetTotalTransform(true))
            };

            var modelDoc = comp.GetModelDoc2() as ModelDoc2;
            if (modelDoc != null && modelDoc.GetType() == (int)swDocumentTypes_e.swDocPART)
            {
                var link = new GRM.Link
                {
                    Name = comp.Name2 + "_link"
                };

                // Extract decimated geometry from the bodies
                var part = (PartDoc)modelDoc;
                object[] bodies = (object[])part.GetBodies2((int)swBodyType_e.swAllBodies, true);
                if (bodies != null)
                {
                    foreach (Body2 body in bodies)
                    {
                        var color = (double[])comp.GetModelMaterialPropertyValues("");
                        if (color == null || color.Length < 3) color = new double[] { 0.8, 0.8, 0.8, 1.0 };
                        
                        var geom = geometryExtractor.ExtractBodyGeometry(body, color);
                        if (geom != null)
                        {
                            link.Visuals.Add(geom);
                        }
                    }
                }
                frame.Links.Add(link);
            }

            // Recursive children
            object[] children = comp.GetChildren();
            if (children != null)
            {
                foreach (Component2 child in children)
                {
                    var childFrame = TraverseComponent(child);
                    if (childFrame != null)
                    {
                        frame.Children.Add(childFrame);
                    }
                }
            }

            // Extract internal reference geometry (Coordinate Systems)
            ExtractReferenceFrames(comp, frame);

            return frame;
        }

        private GRM.Frame TraversePart(ModelDoc2 model)
        {
            var frame = new GRM.Frame
            {
                Name = model.GetTitle(),
                Type = "COMPONENT",
                ReferencePath = model.GetTitle()
            };
            frame.Links.Add(new GRM.Link { Name = model.GetTitle() + "_link" });
            return frame;
        }

        private void ExtractReferenceFrames(Component2 comp, GRM.Frame parentFrame)
        {
            var modelDoc = comp.GetModelDoc2() as ModelDoc2;
            if (modelDoc == null) return;

            string[] typesToExtract = { "CoordSys", "RefAxis", "RefPlane" };
            
            Feature feature = modelDoc.FirstFeature();
            while (feature != null)
            {
                string typeName = feature.GetTypeName2();
                if (typesToExtract.Contains(typeName))
                {
                    var childFrame = new GRM.Frame
                    {
                        Name = feature.Name,
                        Type = typeName.ToUpper(),
                        ReferencePath = feature.Name
                    };

                    if (typeName == "CoordSys")
                    {
                        // Get transform relative to the component/assembly origin
                        var swTransform = modelDoc.Extension.GetCoordinateSystemTransformByName(feature.Name);
                        if (swTransform != null)
                        {
                            childFrame.LocalTransform = ExtractTransform(swTransform);
                        }
                    }
                    // TODO: Implement transform extraction for Axis and Plane if needed
                    // For now, they will appear in the tree with identity transform
                    
                    parentFrame.Children.Add(childFrame);
                }
                feature = (Feature)feature.GetNextFeature();
            }
        }

        private GRM.TransformModel ExtractTransform(MathTransform swTransform)
        {
            if (swTransform == null) return new GRM.TransformModel();

            double[] data = swTransform.ArrayData;
            // SW MathTransform array: [r11, r12, r13, r21, r22, r23, r31, r32, r33, tx, ty, tz, scale]
            
            var transform = new GRM.TransformModel
            {
                Position = new[] { data[9], data[10], data[11] }
            };

            // Convert rotation matrix to quaternion
            // (Standard math conversion)
            double t = data[0] + data[4] + data[8];
            double x, y, z, w;
            if (t > 0)
            {
                double s = Math.Sqrt(t + 1.0) * 2;
                w = 0.25 * s;
                x = (data[7] - data[5]) / s;
                y = (data[2] - data[6]) / s;
                z = (data[3] - data[1]) / s;
            }
            else if ((data[0] > data[4]) && (data[0] > data[8]))
            {
                double s = Math.Sqrt(1.0 + data[0] - data[4] - data[8]) * 2;
                w = (data[7] - data[5]) / s;
                x = 0.25 * s;
                y = (data[1] + data[3]) / s;
                z = (data[2] + data[6]) / s;
            }
            else if (data[4] > data[8])
            {
                double s = Math.Sqrt(1.0 + data[4] - data[0] - data[8]) * 2;
                w = (data[2] - data[6]) / s;
                x = (data[1] + data[3]) / s;
                y = 0.25 * s;
                z = (data[5] + data[7]) / s;
            }
            else
            {
                double s = Math.Sqrt(1.0 + data[8] - data[0] - data[4]) * 2;
                w = (data[3] - data[1]) / s;
                x = (data[2] + data[6]) / s;
                y = (data[5] + data[7]) / s;
                z = 0.25 * s;
            }

            transform.Rotation = new[] { x, y, z, w };
            return transform;
        }
    }
}
