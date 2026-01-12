using System;
using Abstractions = SolidLink.Addin.Abstractions;
using SolidWorks.Interop.sldworks;
using SolidWorks.Interop.swconst;

namespace SolidLink.Addin.Adapters
{
    /// <summary>
    /// Adapter for SolidWorks ModelDoc2.
    /// </summary>
    public class SolidWorksModelDocument : Abstractions.IModelDocument, IDisposable
    {
        private readonly ModelDoc2 _model;
        private Abstractions.IConfiguration _activeConfiguration;
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
