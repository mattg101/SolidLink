namespace SolidLink.Addin.Abstractions
{
    /// <summary>
    /// Abstraction over SolidWorks ModelDoc2.
    /// </summary>
    public interface IModelDocument
    {
        /// <summary>
        /// Gets the document title/name.
        /// </summary>
        string Title { get; }

        /// <summary>
        /// Gets the document type (Part, Assembly, Drawing).
        /// </summary>
        DocumentType Type { get; }

        /// <summary>
        /// Gets the active configuration, or null if not applicable.
        /// </summary>
        IConfiguration ActiveConfiguration { get; }

        /// <summary>
        /// Gets the unit conversion factor from document units to meters.
        /// </summary>
        double UnitToMeters { get; }
    }

    /// <summary>
    /// Document type enumeration matching SolidWorks swDocumentTypes_e.
    /// </summary>
    public enum DocumentType
    {
        Part = 1,
        Assembly = 2,
        Drawing = 3
    }
}
