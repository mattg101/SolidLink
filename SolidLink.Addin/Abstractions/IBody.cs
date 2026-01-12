using System.Collections.Generic;

namespace SolidLink.Addin.Abstractions
{
    /// <summary>
    /// Abstraction over SolidWorks Body2.
    /// </summary>
    public interface IBody
    {
        /// <summary>
        /// Gets the body name.
        /// </summary>
        string Name { get; }

        /// <summary>
        /// Gets the faces of this body for tessellation.
        /// </summary>
        IEnumerable<IFace> Faces { get; }
    }

    /// <summary>
    /// Abstraction over SolidWorks Face2.
    /// </summary>
    public interface IFace
    {
        /// <summary>
        /// Gets the tessellated triangles as a flat array of floats.
        /// Format: [x1, y1, z1, x2, y2, z2, x3, y3, z3, ...] for each triangle.
        /// </summary>
        float[] GetTessTriangles();
    }
}
