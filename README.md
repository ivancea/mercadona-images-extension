# Mercadona images script

## Description

A Tampermonkey script to show images in the old Mercadona website.

_Note_: Not all products have images, so you may not always see them. Check the [Contributing](#contributing) section to know how to add more images.

## How to use

1. Install Tampermonkey extension in your browser
2. In the extension options, add a new script
3. Copy the code from the `tampermonkey.js` file and paste it in the new script
4. Make sure the script is enabled
5. Go to the Mercadona website or reload it
6. Now, while searching the products, you should see the images at the left, if present

## Contributing

This is an open source project, and you can contribute by adding `<product-id>.jpg` images to the `product-images` folder.

To find the products ID, you can go to the catalog, and inspect where the image would be positioned.
You will see there's a hidden `<img>` element before the name of the product.
The `src` attribute of that element will contain the ID of the product.
