using SolidLink.Addin.Abstractions;
using SolidWorks.Interop.sldworks;
using SolidWorks.Interop.swconst;

namespace SolidLink.Addin.Adapters
{
    /// <summary>
    /// Adapter for SolidWorks Configuration.
    /// </summary>
    public class SolidWorksConfiguration : IConfiguration
    {
        private readonly ModelDoc2 _model;
        private readonly Configuration _configuration;
        private IComponent _rootComponent;

        public SolidWorksConfiguration(ModelDoc2 model)
        {
            _model = model;
            _configuration = model?.GetActiveConfiguration() as Configuration;
        }

        public string Name => _configuration?.Name ?? "Default";

        public IComponent RootComponent
        {
            get
            {
                if (_rootComponent != null)
                {
                    return _rootComponent;
                }

                if (_model == null || _model.GetType() != (int)swDocumentTypes_e.swDocASSEMBLY)
                {
                    return null;
                }

                var rootComp = _configuration?.GetRootComponent3(true) as Component2;
                if (rootComp == null)
                {
                    return null;
                }

                _rootComponent = new SolidWorksComponent(rootComp, null);
                return _rootComponent;
            }
        }
    }
}
