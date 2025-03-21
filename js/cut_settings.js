document.addEventListener("DOMContentLoaded", function () {
    // Get all tab links
    const navLinks = document.querySelectorAll("nav ul.left li a");
    const tabContents = document.querySelectorAll(".tabs-content .content");

    navLinks.forEach(link => {
        link.addEventListener("click", function (event) {
            event.preventDefault(); // Prevent default anchor behavior

            // Remove active class from all tabs
            navLinks.forEach(item => item.parentElement.classList.remove("active"));
            tabContents.forEach(content => content.style.display = "none");

            // Add active class to the clicked tab
            this.parentElement.classList.add("active");

            // Show the corresponding content
            const targetId = this.getAttribute("href").substring(1); // Get the ID without #
            document.getElementById(targetId).style.display = "block";
        });
    });

    // Set the default active tab
    document.querySelector("nav ul.left li.active a").click();
});

var variables = {};
variables['ATC'] = {};
variables['TOOLS'] = {};

variables['ATC']['TOOLIN'] = 4;
variables['TOOLS'][1] = { 'Name': '1/4" Downcut' };
variables['TOOLS'][2] = { 'Name': '3/8" O-Flute Upcut' };
variables['TOOLS'][3] = { 'Name': '90deg V-Bit' };
variables['TOOLS'][4] = { 'Name': '1/8" O-Flute Upcut' };
variables['TOOLS'][5] = { 'Name': '1/4" Upcut' };
variables['TOOLS'][6] = { 'Name': '1.25" Surfacing Bit' };
variables['TOOLS'][7] = { 'Name': 'Diamond Drag Bit' };

if(variables['ATC']['TOOLIN']){
    var toolIn = variables['ATC']['TOOLIN']
    var toolDescription = variables['TOOLS'][toolIn]['Name']
    var toolStatus = 'Bit Loaded: ' + toolIn + '<br>' + toolDescription
    $('#currentStatus').html(toolStatus)
}

$.each(variables['TOOLS'], function (toolNumber, toolData) {
    var safeValue = escapeHtmlAttr(toolData.Name) || '';
    var row = `
    <tr>
        <td>${toolNumber}</td>
        <td><input class="tool-description" data-tool="${toolNumber}" type="text" value="${safeValue}"></td>
        <td><a class="button radius small tool-load" style="padding:10px" data-tool="${toolNumber}">Load</a></td>
        <td><a class="button radius small tool-measure" style="padding:10px" data-tool="${toolNumber}">Measure</a></td>
    </tr>
    `;
    $('#toolLibrary tbody').append(row);
});

function escapeHtmlAttr(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

$('#toolLibrary').on('change', '.tool-description', function(e) {
    var toolNumber = $(this).data('tool');
    var newDescription = escapeHtmlAttr($(this).val())
    console.log('$ATC.TOOLS[' + toolNumber + '].Name =' + newDescription)
    fabmo.runSBP('$ATC.TOOLS[' + toolNumber + '].Name =' + newDescription);
    $(this).addClass("flash-green");
    setTimeout(function(){$(this).removeClass("flash-green")},500);
});

$('#toolLibrary').on('click', '.tool-load', function() {
    var toolNumber = $(this).data('tool');
    console.log('running &tool = ' + toolNumber + ' \n C9')
    fabmo.runSBP('&tool = ' + toolNumber + ' \n C9');
});

$('#toolLibrary').on('click', '.tool-measure', function() {
    var toolNumber = $(this).data('tool');
    console.log('running &tool = ' + toolNumber + ' \n C72')
    fabmo.runSBP('&tool = ' + toolNumber + ' \n C72');
});

var machineType = 'ShopBot Desktop ATC'

var imageDir = './files/' + machineType + '.png'
$('#machineImage1').attr('src', imageDir)
$('#machineImage2').attr('src', imageDir)

$('#fixedZZLoc').on('change', function (e) {
    if ($('#fixedZZLoc').prop('checked')) {
        $('#zzXLoc').prop('disabled', false);
        $('#zzYLoc').prop('disabled', false);
    } else {
        $('#zzXLoc').prop('disabled', true);
        $('#zzYLoc').prop('disabled', true);
    }
})

$('#xOffset').on('change', function(e){
    $('#xOffset').addClass("flash-green");
    setTimeout(function(){$('#xOffset').removeClass("flash-green")},500);
})

var fabmo = new FabMoDashboard();
console.log(fabmo)

var config;
var variables;

$(document).ready(function () {
    $(document).on('change', function (e) {
        var keyVals = getKeyVals(e);
        console.log(keyVals);
        var cfg = { opensbp: { variables: {} } }
        cfg.opensbp.variables[keyVals[0]] = keyVals[1];
        fabmo.setConfig(cfg, function (err, data) {
            if (err) { return console.error(err); }
            update();
        });
    });

    update();

});

var getKeyVals = function (e) {
    var target = $(e.target)
    switch (target.prop('tagName').toLowerCase()) {
        case "a":
            return [target.data('variable'), target.data('value')]
        case "input":
            console.log(e.target.id);
            if (e.target.id === "custom-z") {
                console.log($('#ZZeroPlateThickness selcted'));
                $('#ZZeroPlateThickness').find(':selected').val(e.target.value);
                return ["SB_ZPLATETHICK", parseFloat(e.target.value)]
            } else {
                return [e.target.id, parseFloat(e.target.value)]
            }
        case "select":
            if (e.target.value != 0.118 && e.target.value != 0.57) {
                return [e.target.id, parseFloat($('#custom-z').val())]
            } else {
                return [e.target.id, parseFloat(e.target.value)]
            }
        default:
            return [e.target.id, parseFloat(e.target.value)]
    }
};

function update(config, err) {
    fabmo.getConfig(function (err, config) {
        if (err) {
            console.log(err);
        } else {
            var variables = config.opensbp.variables;
            for (var val in variables) {
                var target = $('#' + val);
                // if ( val === "custom-z") {
                //   return
                // }
                if (val === "SB_ZPLATETHICK") {
                    $("#SB_ZPLATETHICK option").each(function () {
                        if ($(this).html() === "Custom") {
                            if (variables[val] != 0.118 && variables[val] != 0.57) {
                                console.log(variables[val]);
                                $('#custom-z').val(variables[val]);
                                $(this).val(variables[val]);

                            }
                        }
                    });
                }
                if (target && target.length && val !== 'custom-z') {
                    switch (target.prop('tagName').toLowerCase()) {
                        case "div":
                            target.find('.select-button').each(function (idx) {
                                if ($(this).data('variable') == val) {
                                    if ($(this).data('value') == variables[val]) {
                                        $(this).addClass('is-primary');
                                    } else {
                                        $(this).removeClass('is-primary');
                                    }
                                }
                            });
                            break;
                        case 'select':
                            target.val(variables[val]);
                            if (target.find(':selected').html() === "Custom") {
                                $('#custom-z').val($('#SB_ZPLATETHICK').find(':selected').val());
                                $('#custom-z').show();
                            } else {
                                $('#custom-z').hide();
                            }
                            break;
                        case 'input':
                            target.val(variables[val]);
                            break;
                    }
                }
            }

            $('.expand-section').each(function (idx) {
                var section = $(this);
                if (variables[section.data('variable')] == section.data('expand-value')) {
                    section.slideDown();
                } else {
                    section.slideUp();
                }
            });
        }
    });
}

$('#allHome').click(function () {
    fabmo.runSBP('C3');
});

$('#zZero').click(function () {
    fabmo.runSBP('C2');
});

$('#runWarmUp').click(function () {
    fabmo.runSBP('C5');
});

$('#runSquare').click(function () {
    fabmo.runSBP('C10');
});


$('.panel-block').click(function () {
    var clicked = $(this).attr('id');
    $('.' + clicked).show();
    $('.panel').hide();
});

$('.delete').click(function () {
    $('.section').hide();
    $('.panel').show();
});



$('#set-offsets').click(function () {
    $.get('./files/offset.sbp', function (data) {
        var file = data.toString();
        fabmo.runSBP(file);
    })
});

$('.select-button').click(function (e) {
    e.preventDefault()
    var keyVals = getKeyVals(e);
    var cfg = { opensbp: { variables: {} } }
    cfg.opensbp.variables[keyVals[0]] = keyVals[1];
    fabmo.setConfig(cfg, function (err, data) {
        if (err) { return console.error(err); }
        update();
    });
});

fabmo.on('status', function (status) {
    console.info(status);
})