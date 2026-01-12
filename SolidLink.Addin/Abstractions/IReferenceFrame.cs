namespace SolidLink.Addin.Abstractions
{
    public interface IReferenceFrame
    {
        string Name { get; }
        string Type { get; }
        double[] TransformMatrix { get; }
    }
}
