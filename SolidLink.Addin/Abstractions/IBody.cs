using System.Collections.Generic;

namespace SolidLink.Addin.Abstractions
{
    public interface IBody
    {
        string Name { get; }
        IEnumerable<IFace> Faces { get; }
    }
}
