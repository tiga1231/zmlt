## TODO
- [DONE] layout initialization script 
- [DONE] clean up data files
- [] requirements.txt
- [] finalize readme

# A Scalable Method for Readable Tree Layouts [[arXiv]](https://arxiv.org/abs/2305.09925)
This repository contains implementation of the Readable Tree Layout, with Compact-Initialization(RT_C)

## System requirements
- Python 3.7+
- A browser with JavaScript enabled

## How to reproduce representative figure (Fig 20(b))
1. Clone this directory:
`git clone --depth=1 git@github.com:tiga1231/zmlt.git`

1. Install dependencies
    - Install Python 3
    - Install required Python packages. E.g., 
      `pip3 install requirements.txt`

1. Run layout initialization script
    `python3 initial-layout.py`

1. Start a web server from this repository. E.g.,
    `python3 -m http.server 8080`

1. From a browser, go to 
    `http://localhost:8080/fig20b.html`
    The optimization will start automatically. 
    The layout will start to update within 15 seconds.
    It should take ~90 sec for the process to finish, on a MacBook Pro with M1 Pro Chip.

Screenshot:
![screenshot](screenshot.png)


## Test bench
Hardware: MacBook Pro, M1 Pro Chip.
OS: MacOS ventura, 13.3.1 (22E261)
Tested Browsers: 
- Google Chrome. Version 112.0.5615.137 (Official Build) (arm64)
- Safari. Version 16.4 (18615.1.26.11.23)
- Firefox. 111.0.1 (64-bit)
