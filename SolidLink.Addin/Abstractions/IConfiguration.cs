namespace SolidLink.Addin.Abstractions
{
    /// <summary>
    /// Abstraction over SolidWorks Configuration.
    /// </summary>
    public interface IConfiguration
    {
        /// <summary>
        /// Gets the configuration name.
        /// </summary>
        string Name { get; }

        /// <summary>
        /// Gets the root component of the assembly in this configuration.
        /// Returns null for Part documents.
        /// </summary>
        IComponent RootComponent { get; }
    }
}
