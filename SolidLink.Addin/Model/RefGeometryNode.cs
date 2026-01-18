namespace SolidLink.Addin.Model
{
    public class RefGeometryNode
    {
        public string Id { get; set; }
        public string Type { get; set; }
        public string Name { get; set; }
        public string Path { get; set; }
        public string ParentPath { get; set; }
        public TransformModel LocalTransform { get; set; }
    }
}
