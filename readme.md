0. Assuming <txt_dir>/*.txt store leveled graphs and each file contains graph edges in the format
    "node1_label" -- "node2_label"
    ...
1. python txt2json.py <txt_dir> out.json
2. Host a web server in the root directory
    e.g., python -m http.server <port>
3. Open <host_ip>:<port>/index.html in browser
