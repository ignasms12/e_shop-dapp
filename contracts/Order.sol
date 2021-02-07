pragma solidity >=0.4.22 <0.8.0;

contract Order{
    uint public productCount = 0;
    uint public orderCount = 0;
    uint public userCount = 0;
    mapping(uint => Product) public products;
    mapping(uint => ord) public orders;
    mapping(string => User) public users;
    enum State {New, InProcess, Submitted, Cancelled }

    struct ord{
        uint orderId;
        uint productCount;
        uint creationDate;
        address payable buyer;
        State orderState;
        uint totalSum;
        mapping(uint => ProductInOrder) addedProducts;
    }

    struct Product{
        uint id;
        string productName;
        uint price;
        uint availableQuantity;
        address payable merchant;
    }

    struct ProductInOrder{
        uint productId;
        uint quantity;
    }

    struct User{
        string username;
        string password;
        address payable userAddress;
    }

    event ProductAdded(
        uint id,
        string productName,
        uint price,
        uint quantity,
        address payable merchant
    );

    event OrderCreated(
        uint orderId,
        uint creationDate
    );

    event ProductAddedToOrder(
        uint _productId,
        uint _quantity
    );

    event UserCreated(
        string username,
        address userAddress
    );

    constructor () public {
        addProduct("televizorius", 200, 3);
        addProduct("kompiuteris", 300, 2);
    }

    function createUser(
        string memory _username,
        string memory _password
    ) public{
        users[_username] = User(_username, _password, msg.sender);
        userCount++;
        emit UserCreated(_username, msg.sender);
    }

    function checkUser(
        string memory _username,
        string memory _password
    ) public view returns (bool){
        string memory password = users[_username].password;
        if(keccak256(abi.encodePacked(password)) == keccak256(abi.encodePacked(_password))){
            return true;
        }
        else{
            return false;
        }
    }

    function addProduct(
        string memory _productName,
        uint _price,
        uint _quantity
    ) private {
        products[productCount] = Product(productCount, _productName, _price, _quantity, msg.sender);
        productCount++;
    }

    function createOrder() public{
        orderCount++;
        ord storage o = orders[orderCount];
        o.orderId = orderCount;
        o.creationDate = block.timestamp;
        o.buyer = msg.sender;
        o.orderState = State.New;

        emit OrderCreated(orderCount, block.timestamp);
    }

    function addProductToOrder(uint productId, uint quantity, uint orderId) public{
        uint prodCount = orders[orderId].productCount;
        bool doesProductExist = false;
        
        for(uint i = 0; i < prodCount; i++){
            if(orders[orderId].addedProducts[i].productId == productId){
                orders[orderId].addedProducts[i].quantity += quantity;
                doesProductExist = true;
            }
        }
        if(doesProductExist == false){
            ProductInOrder memory temp = ProductInOrder(productId, quantity);
            orders[orderId].addedProducts[prodCount] = temp;
            orders[orderId].orderState = State.InProcess;
            
            orders[orderId].productCount++;
        }
        
        orders[orderId].totalSum += products[productId].price * quantity;

        emit ProductAddedToOrder(productId, orderId);
    }

    function submitOrder(uint orderId) public {
        orders[orderId].orderState = State.Submitted;
    }
    
    function userReturn(string memory username) public view returns(address){
        User memory curUser = users[username];
        return curUser.userAddress;
    }

    function getAddedProduct(uint orderId, uint productNo) public view returns(uint, uint){
        ProductInOrder memory temp = orders[orderId].addedProducts[productNo];
        uint productId = temp.productId;
        uint quantity = temp.quantity;
        return (productId, quantity);
    }
}