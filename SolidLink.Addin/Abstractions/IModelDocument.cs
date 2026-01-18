using System.Collections.Generic;

namespace SolidLink.Addin.Abstractions
{
    public interface IModelDocument
    {
        string Title { get; }
        DocumentType Type { get; }
        IConfiguration ActiveConfiguration { get; }
        double UnitToMeters { get; }
        IEnumerable<IReferenceFrame> ReferenceFrames { get; }
    }
}
