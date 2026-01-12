namespace SolidLink.Addin.Abstractions
{
    public interface ISolidWorksContext
    {
        IModelDocument ActiveModel { get; }
        bool IsConnected { get; }
    }
}
