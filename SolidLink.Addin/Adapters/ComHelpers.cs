using System;
using System.Runtime.InteropServices;

namespace SolidLink.Addin.Adapters
{
    internal static class ComHelpers
    {
        public static T SafeCall<T>(Func<T> action, T fallback = default)
        {
            try
            {
                return action();
            }
            catch
            {
                return fallback;
            }
        }

        public static void SafeCall(Action action)
        {
            try
            {
                action();
            }
            catch
            {
            }
        }

        public static void ReleaseComObject(object comObject)
        {
            if (comObject == null)
            {
                return;
            }

            try
            {
                if (Marshal.IsComObject(comObject))
                {
                    Marshal.ReleaseComObject(comObject);
                }
            }
            catch
            {
            }
        }
    }
}
