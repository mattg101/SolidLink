using System.Collections.Generic;
using SolidLink.Addin.Abstractions;
using SolidWorks.Interop.sldworks;

namespace SolidLink.Addin.Adapters
{
    /// <summary>
    /// Adapter for SolidWorks Body2.
    /// </summary>
    public class SolidWorksBody : IBody
    {
        private readonly Body2 _body;
        private List<IFace> _faces;

        public SolidWorksBody(Body2 body)
        {
            _body = body;
        }

        public string Name => _body?.Name ?? "(Unnamed)";

        public IEnumerable<IFace> Faces
        {
            get
            {
                if (_faces != null)
                {
                    return _faces;
                }

                _faces = new List<IFace>();
                var faces = _body?.GetFaces() as object[];
                if (faces != null)
                {
                    foreach (Face2 face in faces)
                    {
                        _faces.Add(new SolidWorksFace(face));
                    }
                }

                return _faces;
            }
        }
    }

    /// <summary>
    /// Adapter for SolidWorks Face2.
    /// </summary>
    public class SolidWorksFace : IFace
    {
        private readonly Face2 _face;

        public SolidWorksFace(Face2 face)
        {
            _face = face;
        }

        public float[] GetTessTriangles()
        {
            return _face?.GetTessTriangles(false) as float[];
        }
    }
}
