namespace SolidLink.Addin.Abstractions
{
    public enum DocumentType
    {
        Assembly,
        Part,
        Drawing
    }

    public interface IModelDocument
    {
        string Title { get; }
        DocumentType Type { get; }
        IConfiguration ActiveConfiguration { get; }
        double UnitToMeters { get; }
    }
}
