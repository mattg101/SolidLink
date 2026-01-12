using System;
using System.Runtime.InteropServices;

namespace SolidLink.Addin.Adapters
{
    public static class ComHelpers
    {
        public static T SafeCall<T>(Func<T> func, T fallback = default(T))
        {
            try
            {
                return func != null ? func() : fallback;
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
                action?.Invoke();
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

            if (Marshal.IsComObject(comObject))
            {
                Marshal.ReleaseComObject(comObject);
            }
        }
    }
}
