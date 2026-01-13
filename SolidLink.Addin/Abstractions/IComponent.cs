using System.Collections.Generic;

namespace SolidLink.Addin.Abstractions
{
    public interface IComponent
    {
        string Name { get; }
        IComponent Parent { get; }
        IEnumerable<IComponent> Children { get; }
        IModelDocument ModelDoc { get; }
        double[] TransformMatrix { get; }
        IEnumerable<IBody> Bodies { get; }
        double[] MaterialColor { get; }
        IEnumerable<IReferenceFrame> ReferenceFrames { get; }
    }
}
