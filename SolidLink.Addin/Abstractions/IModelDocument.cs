namespace SolidLink.Addin.Abstractions
{
    public interface IModelDocument
    {
        string Title { get; }
        DocumentType Type { get; }
        IConfiguration ActiveConfiguration { get; }
        double UnitToMeters { get; }
    }

    public enum DocumentType
    {
        Part,
        Assembly,
        Drawing
    }
}
