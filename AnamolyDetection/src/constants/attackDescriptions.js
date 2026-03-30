export const attackDescriptions = {
  "BENIGN": "This traffic is classified as benign. It represents normal node interactions without any known malicious signatures or abnormal patterns.",
  "DoS": "Denial of Service (DoS) attacks attempt to exhaust system resources (like bandwidth or CPU), rendering the service inaccessible to legitimate users. These typically show up as anomalous spikes in packets/sec.",
  "PortScan": "A Port Scan involves scanning target systems for open ports to identify exploitable vulnerabilities and map out active services. Characterized by sequential sweeping across multiple ports.",
  "SSH BruteForce": "An SSH BruteForce attack involves repetitively attempting various username and password combinations to gain unauthorized shell access. This traffic often originates from a single IP aggressively targeting port 22.",
  "Botnet": "Botnet traffic indicates a network of compromised devices communicating with a Command and Control (C2) server. This activity relates to coordinated distributed attacks.",
  "Web Attack": "Web Attacks specifically target application vulnerabilities using methods such as SQL injection, Cross-Site Scripting (XSS), or directory traversal against HTTP(S) servers.",
  "Unknown": "The system received anomalous behaviour that could not be confidently categorized under a specific signature. It requires manual review by a security analyst."
};
