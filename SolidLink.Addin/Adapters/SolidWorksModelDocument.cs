using System;
using SolidLink.Addin.Abstractions;
using SolidWorks.Interop.sldworks;
using SolidWorks.Interop.swconst;

namespace SolidLink.Addin.Adapters
{
    /// <summary>
    /// Adapter for SolidWorks ModelDoc2.
    /// </summary>
    public class SolidWorksModelDocument : IModelDocument
    {
        private readonly ModelDoc2 _model;
        private IConfiguration _activeConfiguration;

        public SolidWorksModelDocument(ModelDoc2 model)
        {
            _model = model ?? throw new ArgumentNullException(nameof(model));
        }

        public string Title => _model.GetTitle();

        public DocumentType Type
        {
            get
            {
                switch ((swDocumentTypes_e)_model.GetType())
                {
                    case swDocumentTypes_e.swDocASSEMBLY:
                        return DocumentType.Assembly;
                    case swDocumentTypes_e.swDocPART:
                        return DocumentType.Part;
                    case swDocumentTypes_e.swDocDRAWING:
                        return DocumentType.Drawing;
                    default:
                        return DocumentType.Assembly;
                }
            }
        }

        public IConfiguration ActiveConfiguration => _activeConfiguration ?? (_activeConfiguration = new SolidWorksConfiguration(_model));

        public double UnitToMeters => UnitConversionHelper.GetUnitConversionFactor(_model);
    }

    internal static class UnitConversionHelper
    {
        public static double GetUnitConversionFactor(ModelDoc2 doc)
        {
            if (doc == null) return 0.0254; // Default to inches if no doc

            int lengthUnit = doc.Extension.GetUserPreferenceInteger(
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
    }
}
