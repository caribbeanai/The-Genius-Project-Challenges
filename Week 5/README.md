# Week 5: CNNs and Computer Vision

*Caribbean AI - Adrian Dunkley*

This week your neural networks learn to **see**. You start from the idea that an
image is just a grid of numbers, discover the **convolution** that finds patterns
in those numbers, then build real **Convolutional Neural Networks (CNNs)** that
recognise **Caribbean flags** and spot **hurricanes** in satellite tiles. Every
picture is Caribbean, and every picture is drawn with code so you can look inside
it.

By the end you will have trained CNNs with **Keras and TensorFlow** and even
opened one up to see what it learned.

---

## Do the notebooks in this order

Each notebook builds on the one before, so work through them top to bottom.

| Order | Notebook | What it teaches |
| --- | --- | --- |
| 1 | `01-images-are-numbers.ipynb` | The foundation: an image is a **grid of numbers**. Grayscale vs colour (RGB) channels, scaling pixels 0-255 to 0-1, using a Jamaica flag and a hurricane tile. |
| 2 | `02-convolutions-and-filters.ipynb` | The **convolution**, done by hand. Edge and blur **filters**, feature maps, and why a CNN learns filters instead of us picking them. |
| 3 | `03-first-cnn-caribbean-flags.ipynb` | Build a real **CNN in Keras** to classify six Caribbean flags: Jamaica, Haiti, Barbados, Bahamas, Trinidad and Tobago, Guyana. Conv, pooling, dense, softmax, and a confusion matrix. |
| 4 | `04-spotting-hurricanes.ipynb` | A grayscale CNN spots **hurricanes** by shape, plus **Dropout** and **data augmentation**, the trick that makes a vision model robust to the messy real world. |
| 5 | `05-computer-vision-in-the-caribbean.ipynb` | **Open up a trained CNN**: view its learned filters, feature maps, and an occlusion heat map. Then a tour of real Caribbean vision projects, plus limits and ethics. |

Start each notebook at the top and press **Shift + Enter** to run one box at a time.

## The learning arc

```
image = numbers  ->  convolution finds patterns  ->  a CNN learns its own filters
 (Notebook 1)         (Notebook 2, by hand)           (Notebooks 3-4, with Keras)
                                                       ->  look inside it (Notebook 5)
```

## Caribbean examples in this week

- **Flags:** Jamaica, Haiti, Barbados, Bahamas, Trinidad and Tobago, Guyana.
- **Weather:** synthetic "satellite" tiles of clear skies, tropical storms, and
  hurricanes, a nod to real storms like Hurricane Melissa that the region
  watches every season.
- **Real applications:** hurricane tracking, sargassum seaweed detection, coral
  reef health, crop and banana disease, road safety, and heritage across the
  islands.

## The data

Everything lives in the `data` folder and is explained in
`data/variable_dictionary.md`:

- `caribbean_flags.npz`, 2,100 colour flag images (32x32), six classes.
- `satellite_tiles.npz`, 1,200 grayscale weather tiles (32x32), three classes.
- `make_images.py`, the fully commented script that draws every image from a
  fixed random seed, so you can see exactly how the data was made and change it.

The images are drawn with code: believable teaching pictures with small random
noise, brightness, and shifts, **not** photographs of any real place. The point
is to learn how a CNN sees.

## How to run the notebooks

You need Python with a few common libraries plus TensorFlow. Install them once:

```bash
pip install pandas numpy scikit-learn matplotlib jupyter tensorflow
```

Then launch Jupyter and open any notebook:

```bash
jupyter notebook
```

Run a notebook one box at a time with **Shift + Enter**. Read the note above each
box, run it, then try the "Try it yourself" ideas at the bottom. You cannot break
anything by running code.

## New to Python or machine learning?

Do **Week 4** (neural networks and deep learning) first. This week reuses Keras,
layers, training curves, and the "beat a baseline" habit from Week 4, and applies
them to images. If neural networks are brand new, start there, then come back
here to teach them to see.
