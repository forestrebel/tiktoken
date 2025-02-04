"""CLI package setup."""
from setuptools import setup, find_packages

setup(
    name="tiktoken-cli",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "typer",
        "rich",
        "docker",
        "aiohttp",
        "pytest",
        "pytest-asyncio",
    ],
    entry_points={
        "console_scripts": [
            "t=cli.cli:app",
        ],
    },
) 