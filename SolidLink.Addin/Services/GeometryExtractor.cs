using System;
using System.Collections.Generic;
using SolidWorks.Interop.sldworks;
using SolidWorks.Interop.swconst;
using SolidLink.Addin.Model;

namespace SolidLink.Addin.Services
{
    public class GeometryExtractor
    {
        private readonly SldWorks swApp;

        public GeometryExtractor(SldWorks app)
        {
            swApp = app ?? throw new ArgumentNullException(nameof(app));
        }

        public GeometryModel ExtractBodyGeometry(Body2 body, double[] color = null)
        {
            if (body == null) return null;

            List<float> positions = new List<float>();
            List<int> indices = new List<int>();
            int vertexCount = 0;

            object[] faces = (object[])body.GetFaces();
            if (faces != null)
            {
                foreach (Face2 face in faces)
                {
                    // GetTessTriangles returns [x1,y1,z1, x2,y2,z2, x3,y3,z3] for each triangle
                    float[] triangles = (float[])face.GetTessTriangles(true);
                    if (triangles == null) continue;

                    for (int i = 0; i < triangles.Length; i += 3)
                    {
                        positions.Add(triangles[i]);
                        positions.Add(triangles[i + 1]);
                        positions.Add(triangles[i + 2]);
                        indices.Add(vertexCount++);
                    }
                }
            }

            if (positions.Count == 0) return null;

            return new GeometryModel
            {
                Type = "mesh",
                MeshData = new MeshData
                {
                    Positions = positions.ToArray(),
                    Indices = indices.ToArray()
                },
                Color = color ?? new double[] { 0.8, 0.8, 0.8, 1.0 }
            };
        }
    }
}
