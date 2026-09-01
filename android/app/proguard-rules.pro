# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# RevenueCat ships its own consumer rules (-keep class com.revenuecat.** { *; }) in the AAR;
# a duplicate here only hides that fact. Don't re-add one.

# Crashlytics deobfuscation: the crashlytics gradle plugin uploads the R8 mapping, but the
# line numbers have to survive shrinking for it to have anything to map.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
