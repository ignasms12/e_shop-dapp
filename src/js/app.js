App = {
	web3Provider: null,
	contracts: {},
	account: '0x8AEB771f3311ef4A8910c4B74f083E2d17E7Ee9E',
	availableProducts: [],
	orders: [],
	states: ['New', 'InProcess', 'Submitted','Cancelled'],
	selectedProductId: -1,
	

	init: async () => {
		return App.initWeb3();
	},

	bindProductToCard: () =>{
		for(let i = 0; i < App.availableProducts.length; i++){
			let prod = App.availableProducts[i];
			var product = $("<div></div>").addClass('col s2 product').attr('id', `${prod.prodId}_parent`);
			var productCard = $("<div></div>").addClass('card small').attr('id', `${prod.prodId}_card`);
			if(i == 0){
				productCard.addClass('selected-card');
			}
			
			$('#availableProducts').append(product);
			$(`#${prod.prodId}_parent`).append(productCard);
			$(`#productName`).text(App.availableProducts[0].prodName);
			$(`#productPrice`).text(`${App.availableProducts[0].price} ETH`);
			$(`#availableQuantity`).text(App.availableProducts[0].quantity);
		}
		console.log('function succeded');
		$('.card').click((tar)=>{
			$('.selected-card').removeClass('selected-card');
			$(tar.target).addClass('selected-card');
			console.log(tar.target.id);
			var id = tar.target.id.split('_')[0];
			var product = App.availableProducts[id];
			$(`#productName`).text(product.prodName);
			$(`#productPrice`).text(`${product.price} ETH`);
			$(`#availableQuantity`).text(product.quantity);
		})
	
	},

	bindOrderToRow: () =>{
		for(let i = 0; i < App.orders.length; i++){
			if(App.orders[i].state != 'Submitted' || App.orders[i].state != 'Cancelled'){
				let order = App.orders[i];

				var or = $("<tr></tr>").attr('id', `${order.orderId}-order`).addClass('order').attr('href','#orderInfo');
				var a = new Date(order.creationDate * 1000);
				var date = a.getDate();
				if($(`#${order.orderId}-order`).length){
					document.querySelector(`#\\3${order.orderId}-order > td:nth-child(1)`).innerHTML = order.orderId;
					document.querySelector(`#\\3${order.orderId}-order > td:nth-child(2)`).innerHTML = order.productCount;
					document.querySelector(`#\\3${order.orderId}-order > td:nth-child(3)`).innerHTML = `${order.totalSum} ETH`;
					document.querySelector(`#\\3${order.orderId}-order > td:nth-child(4)`).innerHTML = date;
					document.querySelector(`#\\3${order.orderId}-order > td:nth-child(5)`).innerHTML = order.state;
				}
				else{
					$('#orders').append(or);
	
					$(`#${order.orderId}-order`).append($("<td></td>").text(order.orderId));
					$(`#${order.orderId}-order`).append($("<td></td>").text(order.productCount));
					$(`#${order.orderId}-order`).append($("<td></td>").text(`${order.totalSum} ETH`));
					$(`#${order.orderId}-order`).append($("<td></td>").text(date));
					$(`#${order.orderId}-order`).append($("<td></td>").text(order.state));
				}
			}
			if(i == App.orders.length -1){
				$('.preloader-wrapper').css('visibility','hidden');
			}
			
			
		}
		// $('.card').click((tar)=>{
		// 	$('.selected-card').removeClass('selected-card');
		// 	$(tar.target).addClass('selected-card');
		// 	console.log(tar.target.id);
		// 	var id = tar.target.id.split('_')[0];
		// 	var product = App.availableProducts[id];
		// 	$(`#productName`).text(product.prodName);
		// 	$(`#productPrice`).text(`${product.price} ETH`);
		// 	$(`#availableQuantity`).text(product.quantity);
		// })
	
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

	getProducts: (orderInstance, productCount)=>{
			for(let i = 0; i < productCount; i++){
				orderInstance.products(i).then((pr)=>{
					var newProduct = App.fixUp('product',pr);
					console.log(newProduct);
					if(!App.availableProducts.includes(newProduct)){
						App.availableProducts.push(newProduct);
					}
					if(i == productCount-1){
						App.bindProductToCard();
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
				if(App.orders.length == orderCount){
					App.bindOrderToRow();
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
		}).then(async (result)=>{
			App.getOrders();
			await location.reload();
			return result;
		}).catch((err)=>{
			console.error(err);
		});
	},

	submitOrder: async (orderId)=>{
		App.contracts.order.deployed().then((inst)=>{
			return inst.submitOrder(orderId,{from: App.accpimt});
		}).then(async (result)=>{
			App.getOrders();
			await location.reload();
			return result;
		}).catch((err)=>{
			console.error(err);
		})
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



$(document).ready(function(){
    $('.sidenav').sidenav();
	var elem = document.querySelector('.sidenav');
	var instance = M.Sidenav.getInstance(elem);
	$('.modal').modal({
		onOpenStart: function(modal, trigger) {
			instance.close();
		}
	});
	$('#addToOrder').click((tar)=>{
		var selectNum = 2;
		for(let i = 0; i < App.orders.length; i++){
			if(App.orders[i].state != 'Cancelled' || App.orders[i].state != 'Submitted'){
				if($(`#chosenOrderId > select > option:nth-child(${selectNum})`).length){
					$(`#chosenOrderId > select > option:nth-child(${selectNum})`).attr('value', App.orders[i].orderId).text(`Order: ${App.orders[i].orderId}`);
				}
				else{
					var opt = $('<option></option>').attr('value', App.orders[i].orderId).text(`Order: ${App.orders[i].orderId}`);
					$('#chosenOrderId > select').append(opt);
				}
				selectNum++;
			}
			if(i == App.orders.length-1){
				$('select').formSelect();
			}
		}
		var productId = $('.selected-card').attr('id').split('_')[0];
		var availableAmount = App.availableProducts[productId].quantity;
		$('#chosenQuantity').attr('max',availableAmount);
		$('#addToOrder').addClass('hidden');
		$('#chosenOrderId').css('display','block');
		$('.range-field').css('display','block');
		$('#addProduct').css('display','block');
		document.querySelector('#chosenQuantity').value = 0;
		App.selectedProductId = productId;
	});

	$('#addProduct').click(async()=>{
		var amount = document.querySelector('#chosenQuantity').value;
		var orderId = $('li.selected').attr('id').slice(-1) - 1 ;
		console.log(orderId);
		var result = await App.addProductToOrder(App.selectedProductId,amount,orderId);
		$('#chosenOrderId').css('display','none');
		$('.range-field').css('display','none');
		$('#addProduct').css('display','none');
		console.log(result);
	});
	


	$("table.currentOrders").on('click', 'tr',async(target)=>{
		$('#orderInfo').modal('open');
		var orderId = target.currentTarget.id.slice('-')[0];
		console.log(orderId);
		$('#productInfo').empty();
		$('#orderStuff').empty();
		var row = $('<tr></tr>').attr('id','order_row');
		$('#orderStuff').append(row);

		var order = App.orders[orderId];

		$(`#order_row`).append($("<td></td>").text(order.orderId));
		$(`#order_row`).append($("<td></td>").text(order.productCount));
		$(`#order_row`).append($("<td></td>").text(`${order.totalSum} ETH`));
		$(`#order_row`).append($("<td></td>").text(order.creationDate));
		$(`#order_row`).append($("<td></td>").text(order.state));

		for(let i = 0; i < order.products.length; i++){
			var prod = order.products[i];
			var row_p = $('<tr></tr>').attr('id',`order_prod_${i}`);
			$('#productInfo').append(row_p);
			$(`#order_prod_${i}`).append($("<td></td>").text(prod.productName));
			$(`#order_prod_${i}`).append($("<td></td>").text(`${prod.pricePerUnit}  ETH`));
			$(`#order_prod_${i}`).append($("<td></td>").text(`${prod.quantity}`));
			$(`#order_prod_${i}`).append($("<td></td>").text(`${prod.totalPrice} ETH`));
		}

	});

	$('#newOrder').click(()=>{
		App.createOrder();
	})


	$('#submitOrder').click(()=>{
		var orderId = $('#orderStuff > tr > td:nth-child(1)')[0].innerHTML;
		console.log(orderId);
		App.submitOrder(orderId);
	})
});
