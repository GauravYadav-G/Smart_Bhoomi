// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PropertyRegistry {
    
    struct Property {
        string propertyId;
        address owner;
        string propertyHash;
        uint256 registrationDate;
        bool isVerified;
        bool exists;
    }

    // ─── IPFS Document CID record ───
    struct DocumentRecord {
        string ipfsCID;           // IPFS Content Identifier (CIDv1)
        string documentHash;      // SHA-256 hash of original plaintext
        string documentType;      // ownership_deed, sale_deed, etc.
        uint256 uploadTimestamp;
        bool exists;
    }
    
    struct Transfer {
        string propertyId;
        address fromOwner;
        address toOwner;
        uint256 transferDate;
        uint256 amount;
        bool isApproved;
    }
    
    mapping(string => Property) public properties;
    mapping(string => Transfer[]) public transferHistory;
    mapping(address => string[]) public ownerProperties;
    mapping(string => DocumentRecord[]) public propertyDocuments; // propertyId → documents
    
    address public governmentAuthority;
    mapping(address => bool) public authorizedOfficers;
    
    event PropertyRegistered(string propertyId, address owner, string propertyHash, uint256 timestamp);
    event PropertyVerified(string propertyId, address verifiedBy, uint256 timestamp);
    event TransferRequested(string propertyId, address from, address to, uint256 amount);
    event TransferCompleted(string propertyId, address from, address to, uint256 timestamp);
    event DocumentUploaded(string propertyId, string ipfsCID, string documentHash, string documentType, uint256 timestamp);
    
    modifier onlyGovernment() {
        require(msg.sender == governmentAuthority || authorizedOfficers[msg.sender], "Not authorized");
        _;
    }
    
    modifier onlyOwner(string memory propertyId) {
        require(properties[propertyId].owner == msg.sender, "Not property owner");
        _;
    }
    
    constructor() {
        governmentAuthority = msg.sender;
    }
    
    function addAuthorizedOfficer(address officer) public onlyGovernment {
        authorizedOfficers[officer] = true;
    }
    
    function registerProperty(
        string memory propertyId,
        string memory propertyHash
    ) public returns (bool) {
        require(!properties[propertyId].exists, "Property already registered");
        
        properties[propertyId] = Property({
            propertyId: propertyId,
            owner: msg.sender,
            propertyHash: propertyHash,
            registrationDate: block.timestamp,
            isVerified: false,
            exists: true
        });
        
        ownerProperties[msg.sender].push(propertyId);
        
        emit PropertyRegistered(propertyId, msg.sender, propertyHash, block.timestamp);
        return true;
    }
    
    function verifyProperty(string memory propertyId) public onlyGovernment returns (bool) {
        require(properties[propertyId].exists, "Property does not exist");
        properties[propertyId].isVerified = true;
        
        emit PropertyVerified(propertyId, msg.sender, block.timestamp);
        return true;
    }
    
    function initiateTransfer(
        string memory propertyId,
        address toOwner,
        uint256 amount
    ) public onlyOwner(propertyId) returns (bool) {
        require(properties[propertyId].isVerified, "Property not verified");
        
        Transfer memory newTransfer = Transfer({
            propertyId: propertyId,
            fromOwner: msg.sender,
            toOwner: toOwner,
            transferDate: block.timestamp,
            amount: amount,
            isApproved: false
        });
        
        transferHistory[propertyId].push(newTransfer);
        
        emit TransferRequested(propertyId, msg.sender, toOwner, amount);
        return true;
    }
    
    function approveTransfer(
        string memory propertyId,
        uint256 transferIndex
    ) public onlyGovernment returns (bool) {
        require(properties[propertyId].exists, "Property does not exist");
        require(transferIndex < transferHistory[propertyId].length, "Invalid transfer index");
        
        Transfer storage transfer = transferHistory[propertyId][transferIndex];
        require(!transfer.isApproved, "Transfer already approved");
        
        transfer.isApproved = true;
        
        // Remove property from old owner
        removePropertyFromOwner(transfer.fromOwner, propertyId);
        
        // Update property owner
        properties[propertyId].owner = transfer.toOwner;
        ownerProperties[transfer.toOwner].push(propertyId);
        
        emit TransferCompleted(propertyId, transfer.fromOwner, transfer.toOwner, block.timestamp);
        return true;
    }
    
    function getProperty(string memory propertyId) public view returns (
        address owner,
        string memory propertyHash,
        uint256 registrationDate,
        bool isVerified
    ) {
        Property memory prop = properties[propertyId];
        return (prop.owner, prop.propertyHash, prop.registrationDate, prop.isVerified);
    }
    
    function getTransferHistory(string memory propertyId) public view returns (Transfer[] memory) {
        return transferHistory[propertyId];
    }
    
    function getOwnerProperties(address owner) public view returns (string[] memory) {
        return ownerProperties[owner];
    }

    // ─── IPFS DOCUMENT MANAGEMENT ───
    function uploadDocumentCID(
        string memory propertyId,
        string memory ipfsCID,
        string memory documentHash,
        string memory documentType
    ) public returns (bool) {
        require(properties[propertyId].exists, "Property does not exist");
        require(
            properties[propertyId].owner == msg.sender || 
            msg.sender == governmentAuthority || 
            authorizedOfficers[msg.sender],
            "Not authorized to upload documents"
        );

        DocumentRecord memory doc = DocumentRecord({
            ipfsCID: ipfsCID,
            documentHash: documentHash,
            documentType: documentType,
            uploadTimestamp: block.timestamp,
            exists: true
        });

        propertyDocuments[propertyId].push(doc);

        emit DocumentUploaded(propertyId, ipfsCID, documentHash, documentType, block.timestamp);
        return true;
    }

    function getDocumentCID(
        string memory propertyId,
        uint256 documentIndex
    ) public view returns (
        string memory ipfsCID,
        string memory documentHash,
        string memory documentType,
        uint256 uploadTimestamp
    ) {
        require(documentIndex < propertyDocuments[propertyId].length, "Invalid document index");
        DocumentRecord memory doc = propertyDocuments[propertyId][documentIndex];
        return (doc.ipfsCID, doc.documentHash, doc.documentType, doc.uploadTimestamp);
    }

    function getDocumentCount(string memory propertyId) public view returns (uint256) {
        return propertyDocuments[propertyId].length;
    }

    function removePropertyFromOwner(address owner, string memory propertyId) private {
        string[] storage props = ownerProperties[owner];
        for (uint i = 0; i < props.length; i++) {
            if (keccak256(bytes(props[i])) == keccak256(bytes(propertyId))) {
                props[i] = props[props.length - 1];
                props.pop();
                break;
            }
        }
    }
}
