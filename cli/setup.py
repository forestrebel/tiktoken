from setuptools import setup, find_packages

setup(
    name="tiktoken-cli",
    version="0.1.0",
    packages=find_packages(),
    include_package_data=True,
    python_requires=">=3.12.4",
    install_requires=[
        "typer>=0.9.0",
        "rich>=13.0.0",
        "pyyaml>=6.0.0",
        "python-dotenv>=1.0.0",
        "docker-compose>=1.29.2",
        "fastapi>=0.68.0",
        "uvicorn>=0.15.0",
        "aiohttp>=3.8.0",
    ],
    entry_points={
        "console_scripts": [
            "t=cli.cli:main",
        ],
    },
) 