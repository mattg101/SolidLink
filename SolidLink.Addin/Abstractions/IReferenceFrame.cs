namespace SolidLink.Addin.Abstractions
{
    /// <summary>
    /// Abstraction over SolidWorks reference features (coordinate systems, axes, planes).
    /// </summary>
    public interface IReferenceFrame
    {
        /// <summary>
        /// Gets the reference frame name.
        /// </summary>
        string Name { get; }

        /// <summary>
        /// Gets the reference frame type (e.g., "CoordSys", "RefAxis", "RefPlane").
        /// </summary>
        string Type { get; }

        /// <summary>
        /// Gets the transform matrix in SolidWorks MathTransform.ArrayData format.
        /// </summary>
        double[] TransformMatrix { get; }
    }
}
