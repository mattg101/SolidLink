namespace SolidLink.Addin.Abstractions
{
    /// <summary>
    /// Abstraction over SolidWorks application context.
    /// Enables dependency injection for testing without SolidWorks.
    /// </summary>
    public interface ISolidWorksContext
    {
        /// <summary>
        /// Gets the currently active document, or null if none.
        /// </summary>
        IModelDocument ActiveModel { get; }

        /// <summary>
        /// Indicates whether the context is connected to SolidWorks.
        /// </summary>
        bool IsConnected { get; }
    }
}
