/*
 * ext.cargo.query.js
 *
 * Handles JavaScript functionality in the Special:CargoQuery page
 *
 * @author Ankita Mandal
 */
$(document).ready(function() {

	function split( val ) {
		return val.split(/,\s*/);
	}
	function extractLast( term ) {
		return split( term ).pop();
	}
	var my_server = mw.config.get( 'wgScriptPath' ) + "/api.php";

	// Function for Fields, Group_By, Order_By
	$.fn.autocompleteOnSearchString = function ( joinString ) {
		$(this).click(function() {
			$(this).autocomplete( "search", "" );
		});
		var selectOpts = "";
		if ( joinString != "" ) {
			selectOpts = function( event, ui ) {
				var terms = split( this.value );
				// remove the current input
				terms.pop();
				// add the selected item
				terms.push( ui.item.value );
				// add placeholder to get the comma-and-space at the end
				terms.push("");
				this.value = terms.join(joinString);
				return false;
			};
		}
		$(this).autocomplete({
			minLength: 0,
			source: function( request, response ) {

				var searchText = extractLast( request.term );
				$.ajax({
					url: my_server + "?action=cargoqueryautocomplete&format=json&tables=" + $('#tables').val().replace(/\s/g, ''),
					type: 'get',
					dataType: "json",
					data: {
						search: searchText
					},

					success: function (data) {
						var transformed = $.map(data.cargoqueryautocomplete, function ( el ) {
							return {
								label: el,
								id: el
							};
						});
						response(transformed);
					},
					error: function () {
						response([]);
					}
				});
			},

			select: selectOpts

		}).data( "autocomplete" )._renderItem = function( ul, item ) {
			var delim = joinString;
			var term;
			if ( delim === "" ) {
				term = this.term;
			} else {
				term = this.term.split( delim ).pop();
			}
			var re = new RegExp("(?![^&;]+;)(?!<[^<>]*)(" +
				term.replace(/([\^\$\(\)\[\]\{\}\*\.\+\?\|\\])/gi, "\\$1") +
				")(?![^<>]*>)(?![^&;]+;)", "gi");
			// HTML-encode the value's label.
			var itemLabel = $('<div/>').text(item.label).html();
			var loc = itemLabel.search(re);
			var t;
			if (loc >= 0) {
				t = itemLabel.substr(0, loc) +
					'<strong>' + itemLabel.substr(loc, term.length) + '</strong>' +
					itemLabel.substr(loc + term.length);
			} else {
				t = itemLabel;
			}
			return $( "<li></li>" )
				.data( "item.autocomplete", item )
				.append( " <a>" + t + "</a>" )
				.appendTo( ul );
		};
	}
	// Enable autocomplete on tables
	$('#tables').click(function() { $(this).autocomplete( "search", "" ); });
	$('#tables').autocomplete({
		minLength: 0,
		source: function( request, response ) {

			var searchText = extractLast(request.term);
			$.ajax({
				url: my_server + "?action=cargoqueryautocomplete&format=json",
				type: 'get',
				dataType: "json",
				data: {
					search: searchText
				},

				success: function (data) {
					var transformed = $.map(data.cargoqueryautocomplete, function (el) {
						return {
							label: el.main_table,
							id: el.main_table
						};
					});
					response(transformed);
				},
				error: function () {
					response([]);
				}
			});
		},

		select: function( event, ui ) {
			var terms = split( this.value );
			// remove the current input
			terms.pop();
			// add the selected item
			terms.push( ui.item.value );
			// add placeholder to get the comma-and-space at the end
			terms.push("");
			this.value = terms.join(", ");
			return false;
		},

	}).data( "autocomplete" )._renderItem = function( ul, item ) {
		var term = this.term.split( ", " ).pop();
		var re = new RegExp("(?![^&;]+;)(?!<[^<>]*)(" +
			term.replace(/([\^\$\(\)\[\]\{\}\*\.\+\?\|\\])/gi, "\\$1") +
			")(?![^<>]*>)(?![^&;]+;)", "gi");
		// HTML-encode the value's label.
		var itemLabel = $('<div/>').text(item.label).html();
		var loc = itemLabel.search(re);
		var t;
		if (loc >= 0) {
			t = itemLabel.substr(0, loc) +
				'<strong>' + itemLabel.substr(loc, term.length) + '</strong>' +
				itemLabel.substr(loc + term.length);
		} else {
			t = itemLabel;
		}
		return $( "<li></li>" )
			.data( "item.autocomplete", item )
			.append( " <a>" + t + "</a>" )
			.appendTo( ul );
	};

	// Enable autocomplete on fields
	$('#fields').autocompleteOnSearchString(", ");

	// Enable autocomplete on group_by
	$('#group_by').autocompleteOnSearchString(", ");

	// Enable autocomplete on order_by
	$('.order_by').autocompleteOnSearchString("");

	// Display row for 'having' input only if 'group by' has been entered
	$('#group_by').on('change', function(){
		if ($(this).val().length == 0 ) {
			$('#having').parents('tr').hide();
		} else {
			$('#having').parents('tr').show();
		}
	});
	if ( $('#group_by').val().length == 0 ) {
		$('#having').parents('tr').hide();
	}

	// Code to handle multiple "order by" rows
	$('.addButton').on('click', function(){
		var lastRow = $('.orderByRow').last();
		var orderByNum = parseInt(lastRow.attr('data-order-by-num')) + 1;
		var newRow = $('<tr class="mw-htmlform-field-HTMLTextField orderByRow" data-order-by-num=' + orderByNum + '><td></td>' +
			'<td class="mw-input"><input class="form-control order_by" size="50 !important" name="order_by[' + orderByNum + ']"/>' +
			'&nbsp&nbsp<select name="order_by_options[' + orderByNum + ']">' +
			'\t\t<option value="ASC">ASC</option>\n' +
			'\t\t<option value="DESC">DESC</option>\n' +
			'\t</select>&nbsp&nbsp<button class="deleteButton" name="delete" type="button"></button></td></tr>');
		newRow.insertAfter(lastRow);
		newRow.find("input").autocompleteOnSearchString("");
	});

	$("#cargoQueryTable").on("click", ".deleteButton", function() {
		$(this).closest("tr").remove();
	});

	// Form validations
	$.fn.addErrorMessage = function( className, errorMsg ) {
		$(this).after('<tr class="mw-htmlform-field-HTMLTextField ' + className + '"><td></td>' +
			'<td style="color: red; margin-bottom: 20px; text-align: left">' +
			errorMsg + '</td></tr>');
	}

	$('form').on('submit', function (e) {
		// Validate if at least one table name has been entered in the Table(s) field
		if (!$('#tables').val()) {
			if ($(".tablesErrorMessage").length == 0) { // only add if not added
				$("#tables").closest('tr').addErrorMessage( 'tablesErrorMessage', mw.msg( 'cargo-viewdata-tablesrequired' ) );
			}
			e.preventDefault(); // prevent form from submitting
			$('#tables').focus();
		} else {
			$(".tablesErrorMessage").remove();
		}

		// Validate if the Join on value has been entered when multiple tables are there
		var tableval = $('#tables').val().replace(/\s+/g, " ").replace(/^\s|\s$/g, "");
		var lastChar = tableval.slice(-1);
		if (lastChar == ',') {
			tableval = tableval.slice(0, -1);
		}
		if ( ( tableval.includes(',') ) && (!$("#join_on").val()) ) {
			if ($(".joinOnErrorMessage").length == 0) { // only add if not added
				$("#join_on").closest('tr').addErrorMessage( 'joinOnErrorMessage', mw.msg( 'cargo-viewdata-joinonrequired' ) );
			}
			e.preventDefault(); // prevent form from submitting
			$('#join_on').focus();
		} else {
			$(".joinOnErrorMessage").remove();
		}

	});
});
