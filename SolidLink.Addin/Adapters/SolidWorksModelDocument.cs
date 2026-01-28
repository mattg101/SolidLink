using System;
using System.Collections.Generic;
using System.Linq;
using Abstractions = SolidLink.Addin.Abstractions;
using SolidWorks.Interop.sldworks;
using SolidWorks.Interop.swconst;
using IConfiguration = SolidLink.Addin.Abstractions.IConfiguration;

namespace SolidLink.Addin.Adapters
{
    /// <summary>
    /// Adapter for SolidWorks ModelDoc2.
    /// </summary>
    public class SolidWorksModelDocument : Abstractions.IModelDocument, IDisposable
    {
        private readonly ModelDoc2 _model;
        private Abstractions.IConfiguration _activeConfiguration;
        private List<Abstractions.IReferenceFrame> _referenceFrames;
        private bool _disposed;

        public SolidWorksModelDocument(ModelDoc2 model)
        {
            _model = model ?? throw new ArgumentNullException(nameof(model));
        }

        public string Title => ComHelpers.SafeCall(() => _model.GetTitle(), string.Empty);

        public Abstractions.DocumentType Type
        {
            get
            {
                return ComHelpers.SafeCall(() =>
                {
                    switch ((swDocumentTypes_e)_model.GetType())
                    {
                        case swDocumentTypes_e.swDocASSEMBLY:
                            return Abstractions.DocumentType.Assembly;
                        case swDocumentTypes_e.swDocPART:
                            return Abstractions.DocumentType.Part;
                        case swDocumentTypes_e.swDocDRAWING:
                            return Abstractions.DocumentType.Drawing;
                        default:
                            return Abstractions.DocumentType.Assembly;
                    }
                }, Abstractions.DocumentType.Assembly);
            }
        }

        public Abstractions.IConfiguration ActiveConfiguration => _activeConfiguration       
            ?? (_activeConfiguration = ComHelpers.SafeCall(() => new SolidWorksConfiguration(_model)));

        public double UnitToMeters => UnitConversionHelper.GetUnitConversionFactor(_model);

        public IEnumerable<Abstractions.IReferenceFrame> ReferenceFrames
        {
            get
            {
                if (_referenceFrames != null)
                {
                    return _referenceFrames;
                }

                _referenceFrames = new List<Abstractions.IReferenceFrame>();
                Feature feature = null;
                try
                {
                    string[] typesToExtract = { "CoordSys", "RefAxis", "RefPlane" };
                    feature = _model.FirstFeature();
                    while (feature != null)
                    {
                        string typeName = ComHelpers.SafeCall(() => feature.GetTypeName2(), string.Empty);
                        if (typesToExtract.Contains(typeName))
                        {
                            var featureName = ComHelpers.SafeCall(() => feature.Name, string.Empty);
                            double[] transformData = null;
                            double[] axisDirection = null;
                            if (typeName == "CoordSys")
                            {
                                MathTransform swTransform = null;
                                ModelDocExtension extension = null;
                                try
                                {
                                    extension = _model.Extension;
                                    swTransform = extension.GetCoordinateSystemTransformByName(featureName);
                                    transformData = swTransform?.ArrayData as double[];
                                }
                                finally
                                {
                                    ComHelpers.ReleaseComObject(extension);
                                    ComHelpers.ReleaseComObject(swTransform);
                                }
                            }
                            else if (typeName == "RefAxis")
                            {
                                axisDirection = TryGetAxisDirection(feature);
                            }

                            _referenceFrames.Add(new SolidWorksReferenceFrame(featureName, typeName, transformData, axisDirection));
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
                }

                return _referenceFrames;
            }
        }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        ~SolidWorksModelDocument()
        {
            Dispose(false);
        }

        private void Dispose(bool disposing)
        {
            if (_disposed)
            {
                return;
            }

            (_activeConfiguration as IDisposable)?.Dispose();
            ComHelpers.ReleaseComObject(_model);
            _disposed = true;
        }

        private static double[] TryGetAxisDirection(Feature feature)
        {
            RefAxis refAxis = null;
            try
            {
                refAxis = feature?.GetSpecificFeature2() as RefAxis;
                if (refAxis == null)
                {
                    return null;
                }

                var axisParams = refAxis.GetRefAxisParams() as double[];
                if (axisParams == null || axisParams.Length < 6)
                {
                    return null;
                }

                var direction = new[]
                {
                    axisParams[3] - axisParams[0],
                    axisParams[4] - axisParams[1],
                    axisParams[5] - axisParams[2]
                };

                return NormalizeVector(direction);
            }
            catch
            {
                return null;
            }
            finally
            {
                ComHelpers.ReleaseComObject(refAxis);
            }
        }

        private static double[] NormalizeVector(double[] vector)
        {
            if (vector == null || vector.Length < 3)
            {
                return null;
            }

            var length = Math.Sqrt(vector[0] * vector[0] + vector[1] * vector[1] + vector[2] * vector[2]);
            if (length <= 0)
            {
                return null;
            }

            return new[] { vector[0] / length, vector[1] / length, vector[2] / length };
        }
    }

    internal static class UnitConversionHelper
    {
        public static double GetUnitConversionFactor(ModelDoc2 doc)
        {
            return ComHelpers.SafeCall(() =>
            {
                if (doc == null)
                {
                    return 0.0254; // Default to inches if no doc
                }

                ModelDocExtension extension = null;
                try
                {
                    extension = doc.Extension;
                    int lengthUnit = extension.GetUserPreferenceInteger(
                        (int)swUserPreferenceIntegerValue_e.swUnitsLinear,
                        (int)swUserPreferenceOption_e.swDetailingNoOptionSpecified);

                    switch (lengthUnit)
                    {
                        case 0: return 0.001;    // mm to m
                        case 1: return 0.01;     // cm to m
                        case 2: return 1.0;      // m to m
                        case 3: return 0.0254;   // in to m
                        case 4: return 0.3048;   // ft to m
                        case 5: return 0.0254;   // ft&in (treat as inches)
                        case 6: return 0.000001; // um to m
                        default: return 0.0254;  // Default to inches
                    }
                }
                finally
                {
                    ComHelpers.ReleaseComObject(extension);
                }
            }, 0.0254);
        }
    }
}
