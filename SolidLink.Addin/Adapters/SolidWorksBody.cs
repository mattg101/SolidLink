using System;
using System.Collections.Generic;
using SolidLink.Addin.Abstractions;
using SolidWorks.Interop.sldworks;
using IBody = SolidLink.Addin.Abstractions.IBody;
using IFace = SolidLink.Addin.Abstractions.IFace;

namespace SolidLink.Addin.Adapters
{
    /// <summary>
    /// Adapter for SolidWorks Body2.
    /// </summary>
    public class SolidWorksBody : IBody, IDisposable
    {
        private readonly Body2 _body;
        private List<IFace> _faces;
        private bool _disposed;

        public SolidWorksBody(Body2 body)
        {
            _body = body;
        }

        public string Name => ComHelpers.SafeCall(() => _body?.Name ?? "(Unnamed)", "(Unnamed)");

        public IEnumerable<IFace> Faces
        {
            get
            {
                if (_faces != null)
                {
                    return _faces;
                }

                _faces = new List<IFace>();
                ComHelpers.SafeCall(() =>
                {
                    var faces = _body?.GetFaces() as object[];
                    if (faces != null)
                    {
                        foreach (Face2 face in faces)
                        {
                            _faces.Add(new SolidWorksFace(face));
                        }
                    }
                });

                return _faces;
            }
        }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        ~SolidWorksBody()
        {
            Dispose(false);
        }

        private void Dispose(bool disposing)
        {
            if (_disposed)
            {
                return;
            }

            if (_faces != null)
            {
                foreach (var face in _faces)
                {
                    (face as IDisposable)?.Dispose();
                }
            }

            ComHelpers.ReleaseComObject(_body);
            _disposed = true;
        }
    }

    /// <summary>
    /// Adapter for SolidWorks Face2.
    /// </summary>
    public class SolidWorksFace : IFace, IDisposable
    {
        private readonly Face2 _face;
        private bool _disposed;

        public SolidWorksFace(Face2 face)
        {
            _face = face;
        }

        public float[] GetTessTriangles()
        {
            return ComHelpers.SafeCall(() => _face?.GetTessTriangles(false) as float[], new float[0]);
        }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        ~SolidWorksFace()
        {
            Dispose(false);
        }

        private void Dispose(bool disposing)
        {
            if (_disposed)
            {
                return;
            }

            ComHelpers.ReleaseComObject(_face);
            _disposed = true;
        }
    }
}
