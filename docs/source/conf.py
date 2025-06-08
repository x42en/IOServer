# Configuration file for the Sphinx documentation builder.

import os
import sys

# -- Project information -----------------------------------------------------
project = "IOServer"
copyright = "2024, Ben Mz"
author = "Ben Mz"
release = "2.0.0"
version = "2.0.0"

# -- General configuration ---------------------------------------------------
extensions = [
    "sphinx.ext.autodoc",
    "sphinx.ext.viewcode",
    "sphinx.ext.napoleon",
    "sphinx.ext.intersphinx",
    "myst_parser",
]

templates_path = ["_templates"]
exclude_patterns = []

# -- Options for HTML output ------------------------------------------------
html_theme = "sphinx_rtd_theme"
html_static_path = ["_static"]
html_title = f"{project} v{version}"

html_theme_options = {
    "logo_only": False,
    "display_version": True,
    "prev_next_buttons_location": "bottom",
    "style_external_links": False,
    "vcs_pageview_mode": "",
    "collapse_navigation": True,
    "sticky_navigation": True,
    "navigation_depth": 4,
    "includehidden": True,
    "titles_only": False,
}

# -- MyST configuration -----------------------------------------------------
myst_enable_extensions = [
    "colon_fence",
    "deflist",
    "html_admonition",
    "html_image",
    "linkify",
    "replacements",
    "smartquotes",
    "substitution",
    "tasklist",
]

# -- Intersphinx configuration ----------------------------------------------
intersphinx_mapping = {
    "python": ("https://docs.python.org/3/", None),
}
