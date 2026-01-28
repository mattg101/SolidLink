using System;
using System.Collections.Generic;
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

        public List<GRM.RefGeometryNode> ExtractReferenceGeometry(IModelDocument model = null)
        {
            var activeModel = model ?? _context.ActiveModel;
            if (activeModel == null)
            {
                return new List<GRM.RefGeometryNode>();
            }

            var nodes = new List<GRM.RefGeometryNode>();
            if (activeModel.Type == DocumentType.Assembly)
            {
                var rootComp = activeModel.ActiveConfiguration?.RootComponent;
                if (rootComp == null)
                {
                    return nodes;
                }
                TraverseReferenceGeometry(rootComp, nodes, null);
            }
            else if (activeModel.Type == DocumentType.Part)
            {
                var componentPath = activeModel.Title;
                AddReferenceNodes(componentPath, activeModel.ReferenceFrames, nodes);
            }
            return nodes;
        }

        private GRM.Frame TraverseComponent(IComponent comp)
        {
            if (comp == null || comp.IsSuppressed) return null;

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
                if (child == null || child.IsSuppressed)
                {
                    continue;
                }
                var childFrame = TraverseComponent(child);
                if (childFrame != null)
                {
                    frame.Children.Add(childFrame);
                }
            }

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

        private void TraverseReferenceGeometry(IComponent comp, List<GRM.RefGeometryNode> nodes, string parentPath)
        {
            if (comp == null || comp.IsSuppressed)
            {
                return;
            }

            var componentPath = string.IsNullOrWhiteSpace(parentPath)
                ? comp.Name
                : $"{parentPath}/{comp.Name}";

            AddReferenceNodes(componentPath, comp.ReferenceFrames, nodes);

            foreach (var child in comp.Children ?? Enumerable.Empty<IComponent>())
            {
                TraverseReferenceGeometry(child, nodes, componentPath);
            }
        }

        private void AddReferenceNodes(string componentPath, IEnumerable<IReferenceFrame> references, List<GRM.RefGeometryNode> nodes)
        {
            if (references == null) return;

            foreach (var reference in references)
            {
                if (reference == null) continue;
                var normalizedType = NormalizeRefGeometryType(reference.Type);
                if (normalizedType == null) continue;

                var name = string.IsNullOrWhiteSpace(reference.Name) ? "(Unnamed)" : reference.Name;
                var fullPath = string.IsNullOrWhiteSpace(componentPath) ? name : $"{componentPath}/{name}";
                var id = $"{componentPath}|{normalizedType}|{name}";

                nodes.Add(new GRM.RefGeometryNode
                {
                    Id = id,
                    Type = normalizedType,
                    Name = name,
                    Path = fullPath,
                    ParentPath = componentPath,
                    AxisDirection = reference.AxisDirection,
                    LocalTransform = ExtractTransform(reference.TransformMatrix)
                });
            }
        }

        private string NormalizeRefGeometryType(string type)
        {
            if (string.IsNullOrWhiteSpace(type))
            {
                return null;
            }

            switch (type.Trim().ToLower())
            {
                case "coordsys":
                    return "csys";
                case "refaxis":
                    return "axis";
                default:
                    return null;
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
