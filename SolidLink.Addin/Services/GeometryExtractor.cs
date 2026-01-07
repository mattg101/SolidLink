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

        public GeometryModel ExtractBodyGeometry(Body2 body, double[] color = null, ModelDoc2 partDoc = null)
        {
            if (body == null) return null;

            // Get unit conversion factor to meters
            double unitToMeters = GetUnitConversionFactor(partDoc);
            DiagnosticLogger.Log($"  Body: {body.Name ?? "(unnamed)"}, UnitFactor: {unitToMeters}");

            List<float> positions = new List<float>();
            List<int> indices = new List<int>();
            int vertexCount = 0;

            // Track bounding box for diagnostics
            float minX = float.MaxValue, minY = float.MaxValue, minZ = float.MaxValue;
            float maxX = float.MinValue, maxY = float.MinValue, maxZ = float.MinValue;

            object[] faces = (object[])body.GetFaces();
            if (faces != null)
            {
                foreach (Face2 face in faces)
                {
                    // GetTessTriangles returns [x1,y1,z1, x2,y2,z2, x3,y3,z3] for each triangle
                    // bDispContext = false for part-local space (world units)
                    float[] triangles = (float[])face.GetTessTriangles(false);
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
            DiagnosticLogger.Log($"    BBox Size: [{maxX-minX:F4}, {maxY-minY:F4}, {maxZ-minZ:F4}]");

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

        private double GetUnitConversionFactor(ModelDoc2 doc)
        {
            if (doc == null) return 0.0254; // Default to inches if no doc

            // Get the document's length unit system
            // swLengthUnit_e: 0=mm, 1=cm, 2=m, 3=in, 4=ft, 5=ft&in, 6=um, 7=nm, 8=pm, 9=angstrom
            int lengthUnit = doc.Extension.GetUserPreferenceInteger(
                (int)swUserPreferenceIntegerValue_e.swUnitsLinear,
                (int)swUserPreferenceOption_e.swDetailingNoOptionSpecified);

            switch (lengthUnit)
            {
                case 0: return 0.001;    // mm to m
                case 1: return 0.01;     // cm to m
                case 2: return 1.0;      // m to m
                case 3: return 0.0254;   // in to m
                case 4: return 0.3048;   // ft to m
                case 5: return 0.0254;   // ft&in (treat as inches)
                case 6: return 0.000001; // um to m
                default: return 0.0254;  // Default to inches
            }
        }
    }
}
