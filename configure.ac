#                                               -*- Autoconf -*-
# Process this file with autoconf to produce a configure script.

AC_PREREQ([2.69])
AC_INIT([ibus-avro], [1.2.1], [sarim2005@gmail.com])
AM_INIT_AUTOMAKE([foreign])

# Checks for programs.
AC_PATH_PROG([GJS], [gjs])
AS_IF([test -z "$GJS"], [AC_MSG_ERROR([gjs is required])])

# Checks for libraries.
PKG_CHECK_MODULES(ibus, ibus-1.0)

AC_CONFIG_FILES([Makefile])
AC_OUTPUT
