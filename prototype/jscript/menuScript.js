/**
 * Script that implements all the functionality of the menu.
 */
$(document).ready(function(){

    /**
     * Part that make the menu hidden and vice versa.
     */
    $("#headerMenu").click(function(){

        $('#menuPanel').toggle(function() {
                $(this).animate({
                    // style change
                }, 500);
            },function() {
                $(this).animate({
                    // style change back
                }, 500);
            });

        });

    /**
     * Part that show the right div in the menu
     */
    $("#menuHome").click(function(){

        $('#menuContentHome').show();
        $('#menuContentSettings').hide();
        $('#menuContentSave').hide();

    });

    $("#menuSettings").click(function(){

        $('#menuContentHome').hide();
        $('#menuContentSettings').show();
        $('#menuContentSave').hide();

    });

    $("#menuSave").click(function(){

        $('#menuContentHome').hide();
        $('#menuContentSettings').hide();
        $('#menuContentSave').show();

    });


});
