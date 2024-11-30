import json
import qrcode
from PIL import Image


class QRCodeGenerator:
    """This class implements a QR code generator.

    Attributes
    ----------
    nb_rows : int
        Number of rows for splitting images or QR codes.
    nb_cols : int
        Number of columns for splitting images or QR codes.

    Methods
    -------
    split_image: Splits an image into smaller tiles based on the specified number of rows and columns.
    generate_qr_pieces: Generates QR code pieces with overlays based on the specified number of rows and columns.
    generate_qr: Generates a QR code image from a given URL and saves it to a specified output path.
    """

    def __init__(self, nb_rows: int, nb_cols: int):
        """Initialize the QRCodeGenerator with the number of rows and columns for splitting.

        Parameters
        ----------
        nb_rows : int
            Number of rows for splitting images or QR codes.
        nb_cols : int
            Number of columns for splitting images or QR codes.

        """
        self.nb_rows = nb_rows
        self.nb_cols = nb_cols

    def split_image(self, image_path: str, output_dir: str) -> None:
        """Split an image into smaller tiles based on the specified number of rows and columns.

        Parameters
        ----------
        image_path : str
            Path to the input image file.
        output_dir : str
            Directory to save the resulting image tiles.

        """
        img = Image.open(image_path)
        width, height = img.size
        tile_width = width // self.nb_cols
        tile_height = height // self.nb_rows

        for row in range(self.nb_rows):
            for col in range(self.nb_cols):
                left = col * tile_width
                upper = row * tile_height
                right = (col + 1) * tile_width
                lower = (row + 1) * tile_height

                tile = img.crop((left, upper, right, lower))
                tile.save(f"{output_dir}/tile_{row}_{col}.png")

    def generate_custom_qr(
        self, data: str, background_path: str, output_path: str
    ) -> None:
        """Generate a custom QR code with a background image.

        Parameters
        ----------
        data : str
            The data to encode in the QR code.
        background_path : str
            Path to the background image to use.
        output_path : str
            Path to save the resulting custom QR code image.
        """
        qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H)
        qr.add_data(data)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGBA")

        background = Image.open(background_path).convert("RGBA")
        background = background.resize(qr_img.size, Image.Resampling.LANCZOS)

        qr_img.putalpha(100)
        background.putalpha(255)
        combined = Image.alpha_composite(background, qr_img)

        combined.save(output_path)

    def generate_qr_pieces(self, data: str, output_dir: str) -> None:
        """Generate a QR code split into grid pieces and overlays each piece on a specific background image.

        Parameters
        ----------
        data : str
            The data to encode in the QR code.
        output_dir : str
            Directory to save the resulting QR code pieces.

        """
        with open("data/mapping.json", "r") as file:
            mapping = json.load(file)
        mapping = {val: key for key, val in mapping.items()}
        qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H)
        qr.add_data(data)
        qr.make(fit=True)

        qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")

        width, height = qr_img.size
        tile_width = width // self.nb_cols
        tile_height = height // self.nb_rows

        for row in range(self.nb_rows):
            for col in range(self.nb_cols):
                gap = 0
                left = col * (tile_width + gap)
                upper = row * (tile_height + gap)
                right = left + tile_width
                lower = upper + tile_height

                tile = qr_img.crop((left, upper, right, lower))

                background = Image.open(f"data/tiles/tile_{row}_{col}.png").convert(
                    "RGBA"
                )
                background = background.resize(tile.size, Image.Resampling.LANCZOS)

                tile.putalpha(100)
                background.putalpha(255)
                combined = Image.alpha_composite(background, tile)

                day = mapping[f"{row}_{col}"]
                combined.save(f"{output_dir}/qr_{day}.png")


if __name__ == "__main__":
    nb_rows = 4
    nb_cols = 6
    qr_generator = QRCodeGenerator(nb_rows=nb_rows, nb_cols=nb_cols)

    qr_generator.split_image(image_path="data/foreground.png", output_dir="data/tiles")

    # each day is a QR code
    # with open("data/links.json", "r") as file:
    #     links = json.load(file)

    # for day, url in links.items():
    #     qr_generator.generate_custom_qr(
    #         url.replace("watch?v=", "embed/"),
    #         f"data/tiles/tile_{mapping[day]}.png",
    #         f"data/qr_codes/qr_{day}.png",
    #     )

    # a single QR code
    qr_generator.generate_qr_pieces(
        data="https://www.youtube.com/watch?v=8enYdE-xtA8",
        output_dir="data/qr_pieces",
    )
