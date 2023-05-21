## TODO
- layout initialization script 
- clean up data files
- finalize readme


# A Scalable Method for Readable Tree Layouts [[arXiv]](https://arxiv.org/abs/2305.09925)
This repository contains implementation of the Readable Tree Layout, with Compact-Initialization(RT_C)

## How to reproduce representative figure (Fig 20(b))
1. Clone this directory:
`git clone --depth=1 git@github.com:tiga1231/zmlt.git`

1. Either:
  - (Option 1) Use existing initial layout in this repository. 
  You can skip this step and the Python requirement if you choose this option.
  - (Option 2) This options requires Python 3.7+ and packages in requirements.txt
    - Install required Python packages. E.g., 
      `pip3 install requirements.txt`
    - Run layout initialization script
    `python initial-layout.py`

1. Start a web server from this repository. E.g.,
    `python -m http.server 8000`

1. In browser, go to 
    `http://localhost:8080/fig20b.html`

    The optimization will start automatically. 
    The layout will start to update after ~15 seconds.
    It should take ~90 sec for the process to finish, on a MacBook Pro with M1 Pro Chip.
[[screen shot / fig]]

## System requirements
- Python 3.7+
- A browser with JavaScript enabled
- MacOS, Ubuntu Linux or windows

## Test bench
Hardware: MacBook Pro, M1 Pro Chip.
OS: MacOS ventura, 13.3.1 (22E261)
Tested Browsers: 
- Google Chrome, 
- Safari Version 16.4 (18615.1.26.11.23)


%% [//]: # (this is a comment)
%% 1. Assuming <txt_dir>/*.txt store leveled graphs and each file contains graph edges in the format
%%     "node1_label" -- "node2_label"
%%     ...
%% 2. python txt2json.py <txt_dir> out.json
%% 3. Host a web server in the root directory
%%     e.g., python -m http.server <port>
%% 4. Open <host_ip>:<port>/index.html in browser
%% unzip data.zip to data/
%% https://drive.google.com/file/d/1qRiC-6Li_IU4ZyrW2lsxJ5pprg3BvLDt/view?usp=share_link
