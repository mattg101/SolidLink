using System;
using System.Linq;
using SolidLink.Addin.Abstractions;
using GRM = SolidLink.Addin.Model;

namespace SolidLink.Addin.Services
{
    public class TreeTraverser
    {
        private readonly ISolidWorksContext _context;
        private readonly GeometryExtractor _geometryExtractor;

        public TreeTraverser(ISolidWorksContext context, GeometryExtractor geometryExtractor = null)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _geometryExtractor = geometryExtractor ?? new GeometryExtractor();
        }

        public GRM.RobotModel ExtractModel(IModelDocument model = null)
        {
            var activeModel = model ?? _context.ActiveModel;
            if (activeModel == null) return null;

            DiagnosticLogger.Log("========== TREE EXTRACTION START ==========");
            DiagnosticLogger.Log($"Model: {activeModel.Title}");
            DiagnosticLogger.Log($"Type: {activeModel.Type}");

            var robot = new GRM.RobotModel
            {
                Name = activeModel.Title
            };

            if (activeModel.Type == DocumentType.Assembly)
            {
                var rootComp = activeModel.ActiveConfiguration?.RootComponent;
                robot.RootFrame = rootComp != null ? TraverseComponent(rootComp) : TraverseEmptyAssembly(activeModel);
            }
            else
            {
                // Handle single part documents as well
                robot.RootFrame = TraversePart(activeModel);
            }

            return robot;
        }

        private GRM.Frame TraverseComponent(IComponent comp)
        {
            if (comp == null) return null;

            string parentName = comp.Parent != null ? comp.Parent.Name : "(ROOT)";
            DiagnosticLogger.LogComponent(comp.Name, parentName, comp.TransformMatrix);

            var frame = new GRM.Frame
            {
                Name = comp.Name,
                Type = "COMPONENT",
                ReferencePath = comp.Name,
                LocalTransform = ExtractTransform(comp.TransformMatrix)
            };

            var modelDoc = comp.ModelDoc;
            var bodies = comp.Bodies?.ToList();
            if (bodies != null && bodies.Count > 0)
            {
                var link = new GRM.Link
                {
                    Name = comp.Name + "_link"
                };

                double unitToMeters = modelDoc != null ? modelDoc.UnitToMeters : 0.0254;
                foreach (var body in bodies)
                {
                    var geom = _geometryExtractor.ExtractBodyGeometry(body, comp.MaterialColor, unitToMeters);
                    if (geom != null)
                    {
                        link.Visuals.Add(geom);
                    }
                }
                frame.Links.Add(link);
            }

            foreach (var child in comp.Children)
            {
                var childFrame = TraverseComponent(child);
                if (childFrame != null)
                {
                    frame.Children.Add(childFrame);
                }
            }

            ExtractReferenceFrames(comp, frame);

            return frame;
        }

        private GRM.Frame TraversePart(IModelDocument model)
        {
            var frame = new GRM.Frame
            {
                Name = model.Title,
                Type = "COMPONENT",
                ReferencePath = model.Title
            };
            frame.Links.Add(new GRM.Link { Name = model.Title + "_link" });
            return frame;
        }

        private GRM.Frame TraverseEmptyAssembly(IModelDocument model)
        {
            return new GRM.Frame
            {
                Name = model.Title,
                Type = "COMPONENT",
                ReferencePath = model.Title
            };
        }

        private void ExtractReferenceFrames(IComponent comp, GRM.Frame parentFrame)
        {
            var references = comp.ReferenceFrames;
            if (references == null) return;

            foreach (var reference in references)
            {
                if (reference == null) continue;

                var childFrame = new GRM.Frame
                {
                    Name = reference.Name,
                    Type = NormalizeReferenceType(reference.Type),
                    ReferencePath = reference.Name,
                    LocalTransform = ExtractTransform(reference.TransformMatrix)
                };

                parentFrame.Children.Add(childFrame);
            }
        }

        private string NormalizeReferenceType(string type)
        {
            if (string.IsNullOrWhiteSpace(type))
            {
                return "REFERENCE";
            }

            switch (type.Trim().ToLower())
            {
                case "coordsys":
                    return "COORDSYS";
                case "refaxis":
                    return "REFAXIS";
                case "refplane":
                    return "REFPLANE";
                default:
                    return type.ToUpper();
            }
        }

        private GRM.TransformModel ExtractTransform(double[] data)
        {
            if (data == null || data.Length < 12) return new GRM.TransformModel();

            return new GRM.TransformModel
            {
                Position = new[] { data[9], data[10], data[11] },
                Matrix = data
            };
        }
    }
}
