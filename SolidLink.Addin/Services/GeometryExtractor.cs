using System.Collections.Generic;
using SolidLink.Addin.Abstractions;
using SolidLink.Addin.Model;

namespace SolidLink.Addin.Services
{
    public class GeometryExtractor
    {
        public GeometryModel ExtractBodyGeometry(IBody body, double[] color = null, double unitToMeters = 0.0254)
        {
            if (body == null) return null;

            unitToMeters = NormalizeUnitFactor(unitToMeters);
            DiagnosticLogger.Log($"  Body: {body.Name ?? "(unnamed)"}, UnitFactor: {unitToMeters}");

            List<float> positions = new List<float>();
            List<int> indices = new List<int>();
            int vertexCount = 0;

            // Track bounding box for diagnostics
            float minX = float.MaxValue, minY = float.MaxValue, minZ = float.MaxValue;
            float maxX = float.MinValue, maxY = float.MinValue, maxZ = float.MinValue;

            var faces = body.Faces;
            if (faces != null)
            {
                foreach (var face in faces)
                {
                    // GetTessTriangles returns [x1,y1,z1, x2,y2,z2, x3,y3,z3] for each triangle
                    float[] triangles = face.GetTessTriangles();
                    if (triangles == null) continue;

                    for (int i = 0; i < triangles.Length; i += 3)
                    {
                        // Convert from part units to meters
                        float x = (float)(triangles[i] * unitToMeters);
                        float y = (float)(triangles[i + 1] * unitToMeters);
                        float z = (float)(triangles[i + 2] * unitToMeters);

                        positions.Add(x);
                        positions.Add(y);
                        positions.Add(z);
                        indices.Add(vertexCount++);

                        // Update bounding box
                        if (x < minX) minX = x; if (x > maxX) maxX = x;
                        if (y < minY) minY = y; if (y > maxY) maxY = y;
                        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
                    }
                }
            }

            if (positions.Count == 0) return null;

            DiagnosticLogger.Log($"    Vertices: {vertexCount}");
            DiagnosticLogger.Log($"    BBox Min: [{minX:F4}, {minY:F4}, {minZ:F4}]");
            DiagnosticLogger.Log($"    BBox Max: [{maxX:F4}, {maxY:F4}, {maxZ:F4}]");
            DiagnosticLogger.Log($"    BBox Size: [{maxX - minX:F4}, {maxY - minY:F4}, {maxZ - minZ:F4}]");

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

        private double NormalizeUnitFactor(double unitToMeters)
        {
            if (unitToMeters <= 0)
            {
                return 0.0254;
            }
            return unitToMeters;
        }
    }
}
