using System;

namespace SolidLink.Addin.Bridge
{
    public sealed class BridgeMessageEventArgs : EventArgs
    {
        public BridgeMessageEventArgs(BridgeMessage message, string json)
        {
            if (message == null)
                throw new ArgumentNullException("message");
            if (json == null)
                throw new ArgumentNullException("json");

            Message = message;
            Json = json;
        }

        public BridgeMessage Message { get; private set; }
        public string Json { get; private set; }
    }
}
