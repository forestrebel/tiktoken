from setuptools import setup, find_packages

setup(
    name="tiktoken-cli",
    version="0.1.0",
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        "click",
        "python-dotenv",
    ],
    entry_points={
        "console_scripts": [
            "t=tiktoken_cli.cli:cli",
        ],
    },
) 