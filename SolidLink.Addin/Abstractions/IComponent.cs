using System.Collections.Generic;

namespace SolidLink.Addin.Abstractions
{
    /// <summary>
    /// Abstraction over SolidWorks Component2.
    /// </summary>
    public interface IComponent
    {
        /// <summary>
        /// Gets the component name (e.g., "Arm-1").
        /// </summary>
        string Name { get; }

        /// <summary>
        /// Gets the parent component, or null if this is the root.
        /// </summary>
        IComponent Parent { get; }

        /// <summary>
        /// Gets the child components.
        /// </summary>
        IEnumerable<IComponent> Children { get; }

        /// <summary>
        /// Gets the ModelDoc associated with this component, or null.
        /// </summary>
        IModelDocument ModelDoc { get; }

        /// <summary>
        /// Gets the transform matrix (13-element array from SolidWorks MathTransform.ArrayData).
        /// [r11, r12, r13, r21, r22, r23, r31, r32, r33, tx, ty, tz, scale]
        /// </summary>
        double[] TransformMatrix { get; }

        /// <summary>
        /// Gets the bodies contained in this component (for Part documents).
        /// </summary>
        IEnumerable<IBody> Bodies { get; }

        /// <summary>
        /// Gets the material color as [R, G, B, A] in 0-1 range.
        /// </summary>
        double[] MaterialColor { get; }
    }
}
