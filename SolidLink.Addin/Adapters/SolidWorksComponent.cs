using System;
using System.Collections.Generic;
using System.Linq;
using SolidLink.Addin.Abstractions;
using SolidWorks.Interop.sldworks;
using SolidWorks.Interop.swconst;
using IBody = SolidLink.Addin.Abstractions.IBody;
using IComponent = SolidLink.Addin.Abstractions.IComponent;
using IModelDocument = SolidLink.Addin.Abstractions.IModelDocument;
using IReferenceFrame = SolidLink.Addin.Abstractions.IReferenceFrame;

namespace SolidLink.Addin.Adapters
{
    /// <summary>
    /// Adapter for SolidWorks Component2.
    /// </summary>
    public class SolidWorksComponent : IComponent, IDisposable
    {
        private readonly Component2 _component;
        private readonly IComponent _parent;
        private List<IComponent> _children;
        private List<IBody> _bodies;
        private List<IReferenceFrame> _referenceFrames;
        private IModelDocument _modelDoc;
        private bool _disposed;

        public SolidWorksComponent(Component2 component, IComponent parent)
        {
            _component = component;
            _parent = parent;
        }

        public string Name => ComHelpers.SafeCall(() => _component?.Name2 ?? "(Unnamed)", "(Unnamed)");

        public IComponent Parent => _parent;

        public IEnumerable<IComponent> Children
        {
            get
            {
                if (_children != null)
                {
                    return _children;
                }

                _children = ComHelpers.SafeCall(() =>
                {
                    var children = _component?.GetChildren() as object[];
                    return children?.Select(c => (IComponent)new SolidWorksComponent((Component2)c, this)).ToList()
                        ?? new List<IComponent>();
                }, new List<IComponent>());
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

                _modelDoc = ComHelpers.SafeCall(() =>
                {
                    var model = _component?.GetModelDoc2() as ModelDoc2;
                    return model == null ? null : new SolidWorksModelDocument(model);
                });
                return _modelDoc;
            }
        }

        public double[] TransformMatrix
        {
            get
            {
                return ComHelpers.SafeCall(() =>
                {
                    MathTransform transform = null;
                    try
                    {
                        transform = _component?.Transform2;
                        var data = transform?.ArrayData as double[];
                        return data != null && data.Length >= 13 ? data : CreateIdentityTransform();
                    }
                    finally
                    {
                        ComHelpers.ReleaseComObject(transform);
                    }
                }, CreateIdentityTransform());
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
                ModelDoc2 modelDoc = null;
                try
                {
                    modelDoc = _component?.GetModelDoc2() as ModelDoc2;
                    if (modelDoc != null && modelDoc.GetType() == (int)swDocumentTypes_e.swDocPART)
                    {
                        var part = modelDoc as PartDoc;
                        var bodies = part?.GetBodies2((int)swBodyType_e.swAllBodies, true) as object[];
                        if (bodies != null)
                        {
                            foreach (Body2 body in bodies)
                            {
                                _bodies.Add(new SolidWorksBody(body));
                            }
                        }
                    }
                }
                catch
                {
                }
                finally
                {
                    ComHelpers.ReleaseComObject(modelDoc);
                }

                return _bodies;
            }
        }

        public double[] MaterialColor
        {
            get
            {
                return ComHelpers.SafeCall(() =>
                {
                    var color = _component?.GetModelMaterialPropertyValues("") as double[];
                    if (color == null || color.Length < 3)
                    {
                        return new double[] { 0.8, 0.8, 0.8, 1.0 };
                    }
                    return color;
                }, new double[] { 0.8, 0.8, 0.8, 1.0 });
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
                ModelDoc2 modelDoc = null;
                Feature feature = null;
                try
                {
                    modelDoc = _component?.GetModelDoc2() as ModelDoc2;
                    if (modelDoc == null)
                    {
                        return _referenceFrames;
                    }

                    string[] typesToExtract = { "CoordSys", "RefAxis", "RefPlane" };
                    feature = modelDoc.FirstFeature();
                    while (feature != null)
                    {
                        string typeName = ComHelpers.SafeCall(() => feature.GetTypeName2(), string.Empty);
                        if (typesToExtract.Contains(typeName))
                        {
                            var featureName = ComHelpers.SafeCall(() => feature.Name, string.Empty);
                            double[] transformData = null;
                            if (typeName == "CoordSys")
                            {
                                MathTransform swTransform = null;
                                ModelDocExtension extension = null;
                                try
                                {
                                    extension = modelDoc.Extension;
                                    swTransform = extension.GetCoordinateSystemTransformByName(featureName);
                                    transformData = swTransform?.ArrayData as double[];
                                }
                                finally
                                {
                                    ComHelpers.ReleaseComObject(extension);
                                    ComHelpers.ReleaseComObject(swTransform);
                                }
                            }

                            _referenceFrames.Add(new SolidWorksReferenceFrame(featureName, typeName, transformData));
                        }

                        var next = ComHelpers.SafeCall(() => feature.GetNextFeature() as Feature);
                        ComHelpers.ReleaseComObject(feature);
                        feature = next;
                    }
                }
                catch
                {
                }
                finally
                {
                    ComHelpers.ReleaseComObject(feature);
                    ComHelpers.ReleaseComObject(modelDoc);
                }

                return _referenceFrames;
            }
        }

        private static double[] CreateIdentityTransform()
        {
            return new double[] { 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1 };
        }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        ~SolidWorksComponent()
        {
            Dispose(false);
        }

        private void Dispose(bool disposing)
        {
            if (_disposed)
            {
                return;
            }

            if (_children != null)
            {
                foreach (var child in _children)
                {
                    (child as IDisposable)?.Dispose();
                }
            }

            if (_bodies != null)
            {
                foreach (var body in _bodies)
                {
                    (body as IDisposable)?.Dispose();
                }
            }

            (_modelDoc as IDisposable)?.Dispose();
            ComHelpers.ReleaseComObject(_component);
            _disposed = true;
        }
    }
}
