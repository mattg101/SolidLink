using System.Collections.Generic;
using System.Linq;
using SolidLink.Addin.Abstractions;
using SolidWorks.Interop.sldworks;
using SolidWorks.Interop.swconst;

namespace SolidLink.Addin.Adapters
{
    /// <summary>
    /// Adapter for SolidWorks Component2.
    /// </summary>
    public class SolidWorksComponent : IComponent
    {
        private readonly Component2 _component;
        private readonly IComponent _parent;
        private List<IComponent> _children;
        private List<IBody> _bodies;
        private List<IReferenceFrame> _referenceFrames;
        private IModelDocument _modelDoc;

        public SolidWorksComponent(Component2 component, IComponent parent)
        {
            _component = component;
            _parent = parent;
        }

        public string Name => _component?.Name2 ?? "(Unnamed)";

        public IComponent Parent => _parent;

        public IEnumerable<IComponent> Children
        {
            get
            {
                if (_children != null)
                {
                    return _children;
                }

                var children = _component?.GetChildren() as object[];
                _children = children?.Select(c => (IComponent)new SolidWorksComponent((Component2)c, this)).ToList()
                    ?? new List<IComponent>();
                return _children;
            }
        }

        public IModelDocument ModelDoc
        {
            get
            {
                if (_modelDoc != null)
                {
                    return _modelDoc;
                }

                var model = _component?.GetModelDoc2() as ModelDoc2;
                _modelDoc = model == null ? null : new SolidWorksModelDocument(model);
                return _modelDoc;
            }
        }

        public double[] TransformMatrix
        {
            get
            {
                var transform = _component?.Transform2;
                var data = transform?.ArrayData as double[];
                return data != null && data.Length >= 13 ? data : CreateIdentityTransform();
            }
        }

        public IEnumerable<IBody> Bodies
        {
            get
            {
                if (_bodies != null)
                {
                    return _bodies;
                }

                _bodies = new List<IBody>();
                var modelDoc = _component?.GetModelDoc2() as ModelDoc2;
                if (modelDoc != null && modelDoc.GetType() == (int)swDocumentTypes_e.swDocPART)
                {
                    var part = (PartDoc)modelDoc;
                    var bodies = part.GetBodies2((int)swBodyType_e.swAllBodies, true) as object[];
                    if (bodies != null)
                    {
                        foreach (Body2 body in bodies)
                        {
                            _bodies.Add(new SolidWorksBody(body));
                        }
                    }
                }

                return _bodies;
            }
        }

        public double[] MaterialColor
        {
            get
            {
                var color = _component?.GetModelMaterialPropertyValues("") as double[];
                if (color == null || color.Length < 3)
                {
                    return new double[] { 0.8, 0.8, 0.8, 1.0 };
                }
                return color;
            }
        }

        public IEnumerable<IReferenceFrame> ReferenceFrames
        {
            get
            {
                if (_referenceFrames != null)
                {
                    return _referenceFrames;
                }

                _referenceFrames = new List<IReferenceFrame>();
                var modelDoc = _component?.GetModelDoc2() as ModelDoc2;
                if (modelDoc == null)
                {
                    return _referenceFrames;
                }

                string[] typesToExtract = { "CoordSys", "RefAxis", "RefPlane" };
                Feature feature = modelDoc.FirstFeature();
                while (feature != null)
                {
                    string typeName = feature.GetTypeName2();
                    if (typesToExtract.Contains(typeName))
                    {
                        double[] transformData = null;
                        if (typeName == "CoordSys")
                        {
                            var swTransform = modelDoc.Extension.GetCoordinateSystemTransformByName(feature.Name);
                            transformData = swTransform?.ArrayData as double[];
                        }

                        _referenceFrames.Add(new SolidWorksReferenceFrame(feature.Name, typeName, transformData));
                    }

                    feature = (Feature)feature.GetNextFeature();
                }

                return _referenceFrames;
            }
        }

        private static double[] CreateIdentityTransform()
        {
            return new double[] { 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1 };
        }
    }
}
