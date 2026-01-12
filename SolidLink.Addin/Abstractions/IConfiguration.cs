namespace SolidLink.Addin.Abstractions
{
    public interface IConfiguration
    {
        string Name { get; }
        IComponent RootComponent { get; }
    }
}
