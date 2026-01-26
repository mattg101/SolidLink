using System;
using System.Collections.Generic;
using System.Linq;
using Abstractions = SolidLink.Addin.Abstractions;
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
    public class SolidWorksComponent : Abstractions.IComponent, IDisposable
    {
        private readonly Component2 _component;
        private readonly Abstractions.IComponent _parent;
        private List<Abstractions.IComponent> _children;
        private List<Abstractions.IBody> _bodies;
        private List<Abstractions.IReferenceFrame> _referenceFrames;
        private Abstractions.IModelDocument _modelDoc;
        private bool _disposed;

        public SolidWorksComponent(Component2 component, Abstractions.IComponent parent)
        {
            _component = component;
            _parent = parent;
        }

        public string Name => ComHelpers.SafeCall(() => _component?.Name2 ?? "(Unnamed)", "(Unnamed)");

        public Abstractions.IComponent Parent => _parent;

        public IEnumerable<Abstractions.IComponent> Children
        {
            get
            {
                if (_children != null)
                {
                    return _children;
                }

                _children = ComHelpers.SafeCall(() =>
                {
                    var children = GetOrderedChildren();
                    return children.Select(c => (Abstractions.IComponent)new SolidWorksComponent(c, this)).ToList()
                        ?? new List<Abstractions.IComponent>();
                }, new List<Abstractions.IComponent>());
                return _children;
            }
        }

        public Abstractions.IModelDocument ModelDoc
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

        public bool IsSuppressed
        {
            get
            {
                return ComHelpers.SafeCall(() =>
                {
                    return _component != null && _component.IsSuppressed();
                }, false);
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

        private IEnumerable<Component2> GetOrderedChildren()
        {
            var directChildren = _component?.GetChildren() as object[];
            var directList = directChildren?.OfType<Component2>().ToList() ?? new List<Component2>();
            if (directList.Count <= 1)
            {
                return directList;
            }

            var orderIndex = GetAssemblyOrderIndex();
            if (orderIndex.Count == 0)
            {
                return directList;
            }

            return directList
                .OrderBy(child =>
                {
                    var key = GetComponentOrderKey(child);
                    return orderIndex.TryGetValue(key, out var index) ? index : int.MaxValue;
                })
                .ToList();
        }

        private Dictionary<string, int> GetAssemblyOrderIndex()
        {
            var orderIndex = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            ModelDoc2 modelDoc = null;
            try
            {
                modelDoc = _component?.GetModelDoc2() as ModelDoc2;
                if (modelDoc == null || modelDoc.GetType() != (int)swDocumentTypes_e.swDocASSEMBLY)
                {
                    return orderIndex;
                }

                var assembly = modelDoc as AssemblyDoc;
                var ordered = assembly?.GetComponents(true) as object[];
                if (ordered == null || ordered.Length == 0)
                {
                    return orderIndex;
                }

                var index = 0;
                foreach (var comp in ordered.OfType<Component2>())
                {
                    var key = GetComponentOrderKey(comp);
                    if (!string.IsNullOrWhiteSpace(key) && !orderIndex.ContainsKey(key))
                    {
                        orderIndex[key] = index;
                    }
                    index++;
                }
            }
            catch
            {
            }
            finally
            {
                ComHelpers.ReleaseComObject(modelDoc);
            }

            return orderIndex;
        }

        private string GetComponentOrderKey(Component2 component)
        {
            if (component == null)
            {
                return string.Empty;
            }

            var name = ComHelpers.SafeCall(() => component.Name2 ?? string.Empty, string.Empty);
            var path = ComHelpers.SafeCall(() => component.GetPathName() ?? string.Empty, string.Empty);
            return $"{name}|{path}";
        }

        public IEnumerable<Abstractions.IBody> Bodies
        {
            get
            {
                if (_bodies != null)
                {
                    return _bodies;
                }

                _bodies = new List<Abstractions.IBody>();
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

        public IEnumerable<Abstractions.IReferenceFrame> ReferenceFrames
        {
            get
            {
                if (_referenceFrames != null)
                {
                    return _referenceFrames;
                }

                _referenceFrames = new List<Abstractions.IReferenceFrame>();
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
