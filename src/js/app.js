App = {
	web3Provider: null,
	contracts: {},
	account: '0x8AEB771f3311ef4A8910c4B74f083E2d17E7Ee9E',
	availableProducts: [],
	orders: [],
	states: ['New', 'InProcess', 'Submitted','Cancelled'],
	

	init: async () => {
		return App.initWeb3();
	},




	initWeb3: async function () {
		// TODO: refactor conditional
		if (typeof web3 !== 'undefined') {
			// If a web3 instance is already provided by Meta Mask.
			App.web3Provider = web3.currentProvider;
			web3 = new Web3(web3.currentProvider);
		} else {
			// Specify default instance if no web3 instance provided
			App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
			web3 = new Web3(App.web3Provider);
		}

		const ethereum = window.ethereum;
		if(ethereum){
			if(!ethereum.selectedAddress){
				await ethereum.enable();
			}
			userAccount = ethereum.selectedAddress;
		}
		return App.initContract();
	},

	initContract: function () {
		$.getJSON("Order.json", function (order) {
			// Instantiate a new truffle contract from the artifact
			App.contracts.order = TruffleContract(order);
			// Connect provider to interact with contract
			App.contracts.order.setProvider(App.web3Provider);

			App.listenForEvents();

			return App.render();
		});
	},

	// Listen for events emitted from the contract
	listenForEvents: function () {
		
		App.contracts.order.deployed().then(function (instance) {
			// Restart Chrome if you are unable to receive this event
			// This is a known issue with Metamask
			// https://github.com/MetaMask/metamask-extension/issues/2393
			instance.OrderCreated({}, {
				fromBlock: 0,
				toBlock: 'latest'
			}).watch((error, event)=> {
				console.log("OrderCreated event triggered");
				App.contracts.order.deployed().then( async (inst)=>{
					var orderCount = await inst.orderCount();
					App.getOrders(inst, orderCount);
				});
			});
			instance.ProductAddedToOrder({}, {
				fromBlock: 0,
				toBlock: 'latest'
			}).watch((error, event)=>{
				console.log("ProductAddedToOrder event triggered");
				App.contracts.order.deployed().then(async (inst)=>{
					var orderCount = await inst.orderCount();
					App.getOrders(inst, orderCount);
				});
			});
		});
	},

	render: function () {
		var orderInstance;
		var loader = $("#loader");
		var content = $("#content");

		loader.show();
		content.hide();

		// Load account data
		web3.eth.getCoinbase(function (err, account) {
			if (err === null) {
				App.account = account;
				$("#accountAddress").html("Your Account: " + account);
				// console.log(`account: ${account}`);
			}
		});

		App.contracts.order.deployed().then(async (instance) => {
			orderInstance = instance;
			let num = await orderInstance.orderCount();
			return num;
		}).then(async (orderCount) => {
			console.log("====================================> callinamas then <====================================");
			var productCount = await orderInstance.productCount();
			console.log(`productCount = ${productCount}`);

			if(productCount > 0){
				App.getProducts(orderInstance, productCount);
			}
			else{
				console.log('No products found');
			}
			if (orderCount > 0) {
				console.log(`orderCount is: ${orderCount}`);
				App.getOrders(orderInstance, orderCount);
			}
			else{
				console.log('No orders found');
			}
		});

	},

	getProducts: async(orderInstance, productCount)=>{
		for(let i = 0; i < productCount; i++){
			orderInstance.products(i).then((pr)=>{
				var newProduct = App.fixUp('product',pr);
				console.log(newProduct);
				if(!App.availableProducts.includes(newProduct)){
					App.availableProducts.push(newProduct);
				}
			})
		}
	},

	getOrders: async (orderInstance, orderCount) =>{
		for (let i = 0; i < orderCount; i++) {
			orderInstance.orders(i).then(async (order) => {
				if(order[1].toNumber()>0){
					var products = [];
					for(let j = 0; j < order[1].toNumber(); j++){
						var ob;
						await orderInstance.getAddedProduct(i, j).then((res)=>{
							ob = res;
						}).catch(console.log);
						products.push(ob);
					}
					order[6] = products;
				}
				var ord = App.fixUp('order',order);


				function push(flag, identifier){
					if(flag == 0){
						App.orders.push(ord);
					}
					else{
						App.orders[identifier] = ord;
					}
				}


				var flag = 0;
				var identifier = -1;
				var counter = 0;

				if(App.orders.length == 0){
					push(flag);
				}
				for(let i = 0; i < App.orders.length; i++){
					// console.log('item: ', App.orders[i]);
					if(_.isEqual(App.orders[i].orderId,ord.orderId)){
						flag = 1;
						identifier = i;
					}
					counter++;
					if(counter == App.orders.length){
						push(flag, identifier);
					}
				}
				
				
			})
		}
		console.log(App.orders);
	},

	getOrder: async ()=>{
		App.contracts.order.deployed()
		.then(async (i)=> {
			var orders = await i.orders(App.account);
			console.log(orders);
			console.log(orders[3]);
			console.log(orders[3][0]);
		})
	},

	createOrder: async ()=>{
		console.log("createOrder called");
		App.contracts.order.deployed().then((inst)=>{
			console.log("contract deployed");
			var res = inst.createOrder({from: App.account});
			return res;
		}).then((result)=>{
			console.log("Rezultatas:", result);
		}).catch((err)=>{
			console.error(err);
		})
	},

	addProductToOrder: async (productId, quantity, orderId)=>{
		App.contracts.order.deployed().then((inst)=>{
			return inst.addProductToOrder(productId, quantity, orderId, {
				from: App.account
			});
		}).then((result)=>{
			console.log('Then callas');
			console.log(result);
			App.getOrders();
		}).catch((err)=>{
			console.error(err);
		});
	},

	fixUp: (objectType, obj)=>{
		if(objectType == 'product'){
			var newObj = {
				"prodId": obj[0].toNumber(),
				"prodName": obj[1],
				"price": obj[2].toNumber(),
				"quantity": obj[3].toNumber(),
				"merchantAddress": obj[4]
			};
			return newObj;
		}
		else if(objectType == 'order'){
			if(obj[6]){
				var products = [];
				for(let i = 0; i < obj[6].length; i++){
					var allProducts = obj[6];
					var product = {
						"productId": allProducts[i][0].toNumber(),
						"productName": App.availableProducts[allProducts[i][0].toNumber()].prodName,
						"pricePerUnit": App.availableProducts[allProducts[i][0].toNumber()].price,
						"quantity": allProducts[i][1].toNumber(),
						"totalPrice": allProducts[i][1].toNumber() * App.availableProducts[allProducts[i][0].toNumber()].price
					};
					products.push(product);
				}
				// console.log('products',products);
				
				var newObj = {
					"orderId": obj[0].toNumber(),
					"productCount": obj[1].toNumber(),
					"creationDate": obj[2].toNumber(),
					"buyer": obj[3],
					"state": App.states[obj[4].toNumber()],
					"totalSum": obj[5].toNumber(),
					"products": products
				};
			}
			else{
				var newObj = {
					"orderId": obj[0].toNumber(),
					"productCount": obj[1].toNumber(),
					"creationDate": obj[2].toNumber(),
					"buyer": obj[3],
					"state": App.states[obj[4].toNumber()],
					"totalSum": obj[5].toNumber()
				};
			}
			// console.log(newObj);
			return newObj;
		}
	}




	// castVote: function () {
	// 	var candidateId = $('#candidatesSelect').val();
	// 	App.contracts.order.deployed().then(function (instance) {
	// 		return instance.vote(candidateId, {
	// 			from: App.account
	// 		});
	// 	}).then(function (result) {
	// 		// Wait for votes to update
	// 		$("#content").hide();
	// 		$("#loader").show();
	// 	}).catch(function (err) {
	// 		console.error(err);
	// 	});
	// }


		// // Load contract data
		// App.contracts.order.deployed().then(async function (instance) {
		// 	orderInstance = instance;
		// 	let num = await orderInstance.orderCount();
		// 	// console.log(`orderCount: ${num}`);
		// 	return orderInstance.orderCount();
		// }).then(function (orderCount) {
		// 	var candidatesResults = $("#candidatesResults");
		// 	candidatesResults.empty();

		// 	var candidatesSelect = $('#candidatesSelect');
		// 	candidatesSelect.empty();

		// 	for (var i = 1; i <= orderCount; i++) {
		// 		orderInstance.orders(i).then(function (candidate) {
		// 			var id = candidate[0];
		// 			var name = candidate[1];
		// 			var voteCount = candidate[2];

		// 			// Render candidate Result
		// 			var candidateTemplate = "<tr><th>" + id + "</th><td>" + name + "</td><td>" + voteCount + "</td></tr>"
		// 			candidatesResults.append(candidateTemplate);

		// 			// Render candidate ballot option
		// 			var candidateOption = "<option value='" + id + "' >" + name + "</ option>"
		// 			candidatesSelect.append(candidateOption);
		// 		});
		// 	}
		// 	return orderInstance.userReturn(App.account);
		// }).then(function (hasVoted) {
		// 	// Do not allow a user to vote
		// 	if (hasVoted) {
		// 		$('form').hide();
		// 	}
		// 	loader.hide();
		// 	content.show();
		// }).catch(function (error) {
		// 	console.warn(error);
		// });
};

$(function () {
	$(window).load(function () {
		App.init();
	});
});

const bindProductToCard = () =>{

	var product = $("<div></div>").class('col s2 product').attr('id', `${item}_parent`);
	var productCard = $("<div></div>").class('card small').attr('id', `${item}_card`);
	
	$('#availableProducts').append(product);
	$(`${item}_parent`).append(productCard);

}

$(document).ready(function(){
    $('.sidenav').sidenav();
	var elem = document.querySelector('.sidenav');
	var instance = M.Sidenav.getInstance(elem);
	$('.modal').modal({
		onOpenStart: function(modal, trigger) {
			instance.close();
		}
	});
	$('.card').click((tar)=>{
		$('.selected-card').removeClass('selected-card');
		$(tar.target).addClass('selected-card');
	})
});
