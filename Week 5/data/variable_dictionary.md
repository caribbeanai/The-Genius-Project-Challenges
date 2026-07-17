# Data Dictionary, Week 5

*Caribbean AI - Adrian Dunkley*

This folder holds the Caribbean **image** data the Week 5 CNNs learn from. Unlike
the earlier weeks (tables of numbers), this week the data is pictures. Every
image is **drawn with code** from a fixed random seed, so it is a believable
teaching picture, not a photograph of any real place. Small random noise,
brightness, and shifts are added so the networks must learn real patterns rather
than memorise identical pixels.

The script `make_images.py` in this folder generates both files and is fully
commented, so you can read exactly how each picture is drawn and change it.

---

## `caribbean_flags.npz` (Notebooks 1, 2, 3, 5)

Simplified colour flags of six Caribbean nations. Load it with NumPy:

```python
import numpy as np
data = np.load("data/caribbean_flags.npz", allow_pickle=True)
X = data["X"]                 # images
y = data["y"]                 # labels (0-5)
class_names = list(data["class_names"])
```

| Item | What it is |
| --- | --- |
| `X` | 2,100 images, shape `(2100, 32, 32, 3)`. Each is 32x32 pixels with 3 colour channels (red, green, blue). Stored as whole numbers 0-255; divide by 255 to get 0-1. |
| `y` | 2,100 labels, one per image, a number 0-5. |
| `class_names` | The six flags in label order: `Jamaica`, `Haiti`, `Barbados`, `Bahamas`, `Trinidad and Tobago`, `Guyana`. |

**Why these six:** they mix colours and layouts (diagonals, horizontal bands,
vertical bands, triangles), so the CNN must use both **colour** and **shape** to
tell them apart. 350 images per flag.

---

## `satellite_tiles.npz` (Notebooks 1, 2, 4)

Grayscale "satellite" weather tiles in three classes. Load it the same way:

```python
sat = np.load("data/satellite_tiles.npz", allow_pickle=True)
X = sat["X"]                  # shape (1200, 32, 32, 1)
y = sat["y"]                  # labels (0-2)
class_names = list(sat["class_names"])
```

| Item | What it is |
| --- | --- |
| `X` | 1,200 images, shape `(1200, 32, 32, 1)`. Each is 32x32 pixels with 1 grayscale channel. Stored 0-255; divide by 255 to get 0-1. |
| `y` | 1,200 labels, a number 0-2. |
| `class_names` | The three weather types: `clear`, `tropical_storm`, `hurricane`. |

**The shapes the CNN learns:**

- `clear`: a few small scattered clouds on a dark ocean.
- `tropical_storm`: one large, diffuse bright blob, no clear structure.
- `hurricane`: a bright **spiral** of cloud bands wrapped around a calm, dark
  **eye**, the tell-tale sign forecasters look for.

Because this data is grayscale, colour cannot help; the network must learn
**shape**, which is exactly what convolutions do best. 400 images per class.

---

## `make_images.py`

The generator. Run it to rebuild both `.npz` files from scratch:

```bash
python make_images.py
```

It uses fixed random seeds, so it always produces the same images. Reading it is
a good way to understand how the flags and storms are drawn, and a fun thing to
tinker with (try adding a seventh flag, or a new weather class).
