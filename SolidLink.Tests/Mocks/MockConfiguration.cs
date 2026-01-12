using SolidLink.Addin.Abstractions;

namespace SolidLink.Tests.Mocks
{
    /// <summary>
    /// Mock implementation of IConfiguration.
    /// </summary>
    public class MockConfiguration : IConfiguration
    {
        private readonly ComponentFixture _rootFixture;
        private IComponent _rootComponent;

        public MockConfiguration(string name, ComponentFixture rootFixture)
        {
            Name = name;
            _rootFixture = rootFixture;
        }

        public string Name { get; }

        public IComponent RootComponent
        {
            get
            {
                if (_rootComponent == null && _rootFixture != null)
                {
                    _rootComponent = new MockComponent(_rootFixture, null);
                }
                return _rootComponent;
            }
        }
    }
}
